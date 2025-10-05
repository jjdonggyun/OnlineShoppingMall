import Nav from '../components/Nav'
import Hero from '../components/Hero'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types/product'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import SelectProductModal from '../components/SelectProductModal'
import { useProducts } from '../hooks/useProducts'

/** 메인 칩 전용 해시태그 타입: CATEGORY만 취급 */
type MainHashtag = {
  id: string
  label: string        // 칩에 보여줄 텍스트(자유롭게 변경 가능)
  emoji?: string | null
  type: 'CATEGORY'     // 메인 섹션은 CATEGORY만
  value: string        // 실제 필터에 쓸 카테고리 값
}

function useMediaQuery(q: string) {
  const [ok, setOk] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(q).matches : false
  )
  useEffect(() => {
    const m = window.matchMedia(q)
    const h = (e: MediaQueryListEvent) => setOk(e.matches)
    m.addEventListener('change', h)
    setOk(m.matches)
    return () => m.removeEventListener('change', h)
  }, [q])
  return ok
}

// 기존 콜렉션 섹션 그대로
function useCollection(name: 'RECOMMENDED' | 'SEASONAL' | 'BEST') {
  return useQuery({
    queryKey: ['collection', name],
    queryFn: async () => {
      const r = await fetch(`/api/collections/${name}`)
      if (!r.ok) return [] as Product[]
      return r.json() as Promise<Product[]>
    },
  })
}

function Section({
  title,
  eyebrow,
  name,
  onAdd,
}: {
  title: string
  eyebrow?: string
  name: 'RECOMMENDED' | 'SEASONAL' | 'BEST'
  onAdd?: () => void
}) {
  const { data, isLoading } = useCollection(name)
  const { user } = useAuth((s) => ({ user: s.user }))
  const qc = useQueryClient()

  async function handleRemove(productId: string) {
    const r = await fetch(`/api/collections/${name}/items/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (r.ok) qc.invalidateQueries({ queryKey: ['collection', name] })
    else {
      const e = await r.json().catch(() => ({}))
      alert(e?.error || '제거에 실패했습니다.')
    }
  }

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-[1520px] px-3 sm:px-4">
        <div className="mb-6">
          <div className="text-center">
            {eyebrow && (
              <div className="text-sm text-gray-400 font-medium tracking-wide flex items-center justify-center gap-1">
                <span>{eyebrow}</span>
              </div>
            )}
            <h3 className="mt-1 text-xl text-gray-600 md:text-=3xl lg:text-[28px] leading-tight tracking-tight">
              {title}
            </h3>
          </div>

          {user?.role === 'ADMIN' && (
            <div className="mt-3 text-right">
              <button
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                onClick={onAdd}
              >
                {title} 추가
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[368/462] skeleton rounded-lg"></div>
                <div className="h-4 w-3/4 skeleton rounded"></div>
                <div className="h-4 w-1/2 skeleton rounded"></div>
              </div>
            ))}

          {data?.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onRemove={user?.role === 'ADMIN' ? handleRemove : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/** 메인 섹션용 해시태그: CATEGORY만 가져오기 */
function useMainCategoryHashtags() {
  return useQuery({
    queryKey: ['hashtags', 'main-category-only'],
    queryFn: async () => {
      // ★ CATEGORY만! (MENU/TAG/CHANNEL 제외)
      const r = await fetch('/api/hashtags?type=CATEGORY')
      if (!r.ok) return [] as MainHashtag[]
      return r.json() as Promise<MainHashtag[]>
    },
  })
}

/** 카테고리 폴백(해시태그가 0개일 때만 사용) */
function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await fetch('/api/products/categories')
      if (!r.ok) return [] as string[]
      return r.json() as Promise<string[]>
    },
  })
}

function HashChip({
  label,
  active,
  onClick,
  emoji,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  emoji?: string | null
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 md:px-4 py-2 rounded-[10px] text-sm md:text-base transition",
        "border",
        active
          ? "bg-[#B37B5E] text-white border-[#B37B5E] shadow-sm"
          : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50",
      ].join(" ")}
    >
      <span className="mr-1">#</span>
      <span>{label}</span>
      {emoji && <span className="ml-1">{emoji}</span>}
    </button>
  )
}

export default function App() {
  const nav = useNavigate()
  const isMobile = useMediaQuery('(max-width: 767px)')

  // 1) 서버의 "CATEGORY 타입" 해시태그만 로드 (메인 칩 전용)
  const { data: catHashtags = [] } = useMainCategoryHashtags()

  // 2) 폴백(해시태그가 하나도 없을 때만 카테고리로 칩 구성)
  const { data: cats = [] } = useCategories()
  const fallbackHashtags: MainHashtag[] = useMemo(
    () =>
      cats.map((c) => ({
        id: `cat:${c}`,
        label: c,            // 폴백에선 라벨=값
        type: 'CATEGORY' as const,
        value: c,
      })),
    [cats]
  )

  // 메인 칩 소스: 있으면 CATEGORY 해시태그, 없으면 폴백
  const chips: MainHashtag[] = catHashtags.length ? catHashtags : fallbackHashtags

  // 선택 상태: 'ALL' 또는 CATEGORY 해시태그
  const [sel, setSel] = useState<'ALL' | MainHashtag>('ALL')

  // 3) 선택에 맞춰 useProducts 파라미터 매핑 (CATEGORY만)
  const queryOpts = useMemo(() => {
    if (sel === 'ALL') return {}
    return { category: sel.value }
  }, [sel])

  const { data, isLoading } = useProducts({
    ...(queryOpts as any),
    limit: isMobile ? 6 : undefined,
  })

  // 타이틀
  const title = sel === 'ALL' ? '우리들의 계절' : sel.label

  const [modal, setModal] =
    useState<null | { name: 'RECOMMENDED' | 'SEASONAL' | 'BEST' }>(null)

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <Hero />

      <div className="text-center mt-10 text-[#877B73]">
        <p className="text-xl mb-3">수냐룩은</p>
        <p className="text-sm">화면너머의 여러분에게 따뜻한 쇼핑메이트이고 싶습니다.</p>
        <p className="text-sm">일상에 스며드는 실용적인 옷들부터</p>
        <p className="text-sm">가장 빛이 나야하는 순간까지 언제나 함께 하겠습니다.</p>
      </div>

      <main className="mt-10">
        <div className="mx-auto max-w-[1520px] px-3 sm:px-4">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-400">지금이 딱이야</div>
            <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
              #{title}
            </h2>
          </div>

          {/* 해시태그 칩 (CATEGORY만) */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <HashChip
              label="전체"
              active={sel === 'ALL'}
              onClick={() => setSel('ALL')}
            />
            {chips.map((h) => (
              <HashChip
                key={h.id}
                label={h.label}       // 화면 표시 이름
                emoji={h.emoji}
                active={sel !== 'ALL' && (sel as MainHashtag).id === h.id}
                onClick={() => setSel(h)}
              />
            ))}
          </div>

          {/* 상품 그리드 */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading &&
              Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-[368/462] skeleton rounded-lg" />
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-4 w-1/2 skeleton rounded" />
                </div>
              ))}
            {data?.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {/* 모바일 more */}
          {isMobile && (data?.length ?? 0) >= 6 && (
            <div className="mt-4 text-center">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => {
                  // 현재 선택 상태를 ProductsPage로 이어가기 (CATEGORY만)
                  const s = new URLSearchParams()
                  if (sel !== 'ALL') {
                    s.set('category', sel.value)   // 필터는 value 사용
                  }
                  const qs = s.toString()
                  nav(`/products${qs ? `?${qs}` : ''}`)
                }}
              >
                More
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 컬렉션 섹션은 그대로 유지 */}
      <Section
        title="추천 상품"
        eyebrow="오늘의 PICK"
        name="RECOMMENDED"
        onAdd={() => setModal({ name: 'RECOMMENDED' })}
      />
      <Section
        title="가을의 설렘"
        eyebrow="얼리어텀~80%🍂"
        name="SEASONAL"
        onAdd={() => setModal({ name: 'SEASONAL' })}
      />
      <Section
        title="베스트 상품"
        eyebrow="지금 가장 인기"
        name="BEST"
        onAdd={() => setModal({ name: 'BEST' })}
      />

      <Footer />

      {modal && (
        <SelectProductModal name={modal.name} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function Footer() {
  return (
    <div className="mt-20">
      <hr />
      <div className="text-center text-xs text-gray-500 py-8">
        © 2025 Sample Mall
      </div>
    </div>
  )
}

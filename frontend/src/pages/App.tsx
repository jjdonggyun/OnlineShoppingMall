// App.tsx
import Nav from '../components/Nav'
import Hero from '../components/Hero'
import ProductCard, { Product } from '../components/ProductCard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import SelectProductModal from '../components/SelectProductModal'

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
  eyebrow,  // ← 추가: 작은 상단 서브타이틀
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
        {/* 중앙 정렬 헤더 */}
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

          {/* ADMIN 버튼은 제목 아래 우측 정렬 */}
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

        {/* 그리드: 2 / 3 / 4 칼럼 통일 */}
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

function useProducts(category: string, limit?: number) {
  const key = ['products', category, limit]
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category && category !== 'ALL') params.set('category', category)
      if (limit) params.set('limit', String(limit))
      const r = await fetch(`/api/products?${params.toString()}`)
      if (!r.ok) return [] as Product[]
      return r.json() as Promise<Product[]>
    },
  })
}

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

function CategoryChip({
  label,
  active,
  onClick,
  emoji,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  emoji?: string
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
  const [cat, setCat] = useState<string>('ALL')

  const { data: cats } = useCategories()
  const { data, isLoading } = useProducts(cat, isMobile ? 6 : undefined)

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

      {/* 이벤트 상품 리스트 넣기 */}
      {/* ex ) 1. 밤 10시 30분까지 주문하면 오늘 출발 */}
      {/* ex ) 2. 예쁘니까 1+1 */}
      {/* ex ) 3. 실시간으로 사랑받는 'BEST 등등' */}

      {/* 큐레이션 섹션 3종 */}
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

      {/* 카테고리별 리스트 */}
      {/* 카테고리별 리스트 */}
      <main className="mt-10">
        <div className="mx-auto max-w-[1520px] px-3 sm:px-4">

          {/* ⬇️ 상단 서브타이틀 + 메인 타이틀(가운데) */}
          <div className="text-center mb-6">
            <div className="text-sm text-gray-400">지금이 딱이야</div>
            <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
              #{cat === 'ALL' ? '우리들의 계절' : cat}
            </h2>
          </div>

          {/* ⬇️ 해시태그 스타일 카테고리 바 */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <CategoryChip
              label="전체"
              active={cat === 'ALL'}
              onClick={() => setCat('ALL')}
            />
            {cats?.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                active={cat === c}
                onClick={() => setCat(c)}
                emoji={/가을|autumn|fall/i.test(c) ? "🍂" : undefined}  // 가을 관련이면 🍂 표시
              />
            ))}
          </div>

          {/* ⬇️ 상품 그리드 (그대로) */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading &&
              Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-[368/462] skeleton rounded-lg"></div>
                  <div className="h-4 w-3/4 skeleton rounded"></div>
                  <div className="h-4 w-1/2 skeleton rounded"></div>
                </div>
              ))}
            {data?.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {/* 모바일: More 버튼 (그대로) */}
          {isMobile && (data?.length ?? 0) >= 6 && (
            <div className="mt-4 text-center">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => {
                  if (cat === 'ALL') nav('/products')
                  else nav(`/products?category=${encodeURIComponent(cat)}`)
                }}
              >
                More
              </button>
            </div>
          )}
        </div>
      </main>


      <Footer />

      {/* 관리자: 상품 선택 모달 */}
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

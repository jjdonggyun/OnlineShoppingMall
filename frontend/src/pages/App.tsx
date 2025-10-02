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
  name,
  onAdd,
}: {
  title: string
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
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ['collection', name] })
    } else {
      const e = await r.json().catch(() => ({}))
      alert(e?.error || '제거에 실패했습니다.')
    }
  }

  return (
    <section className="container-max mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {user?.role === 'ADMIN' && (
          <button
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            onClick={onAdd}
          >
            {title} 추가
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] skeleton"></div>
              <div className="h-4 w-3/4 skeleton"></div>
              <div className="h-4 w-1/2 skeleton"></div>
            </div>
          ))}
        {data?.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            // 관리자에게만 제거 버튼 노출: onRemove를 넘겨줄 때만 버튼이 렌더됨
            onRemove={user?.role === 'ADMIN' ? handleRemove : undefined}
          />
        ))}
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

      {/* 큐레이션 섹션 3종 */}
      <Section
        title="추천 상품"
        name="RECOMMENDED"
        onAdd={() => setModal({ name: 'RECOMMENDED' })}
      />
      <Section
        title="계절 상품"
        name="SEASONAL"
        onAdd={() => setModal({ name: 'SEASONAL' })}
      />
      <Section
        title="베스트 상품"
        name="BEST"
        onAdd={() => setModal({ name: 'BEST' })}
      />

      {/* 카테고리별 리스트 */}
      <main className="container-max mt-6">
        {/* 카테고리 필터 바 */}
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            className={`px-3 py-1.5 rounded-full border ${
              cat === 'ALL' ? 'bg-black text-white' : 'hover:bg-gray-50'
            }`}
            onClick={() => setCat('ALL')}
          >
            전체
          </button>
          {cats?.map((c) => (
            <button
              key={c}
              className={`px-3 py-1.5 rounded-full border ${
                cat === c ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-3">
          {cat === 'ALL' ? '전체 상품' : `${cat} 상품`}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading &&
            Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] skeleton"></div>
                <div className="h-4 w-3/4 skeleton"></div>
                <div className="h-4 w-1/2 skeleton"></div>
              </div>
            ))}
          {data?.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {/* 모바일: More 버튼 */}
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

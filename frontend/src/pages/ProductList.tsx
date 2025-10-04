// src/pages/ProductList.tsx
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Nav from '../components/Nav'
import ProductCard from '../components/ProductCard'
import type { Product } from '../types/product'

function useQueryParam(name: string) {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search).get(name) ?? '', [search, name])
}

export default function ProductList() {
  const category = useQueryParam('category') || 'ALL'
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'list', category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category && category !== 'ALL') params.set('category', category)
      const r = await fetch(`/api/products?${params.toString()}`)
      return r.json() as Promise<Product[]>
    }
  })

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <main className="py-6">
        <div className="mx-auto max-w-[1520px] px-3 sm:px-4">
          <h1 className="text-xl font-bold mb-4">
            {category === 'ALL' ? '전체 상품' : `${category} 상품`}
          </h1>

          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading && Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[368/462] skeleton rounded-lg"></div>
                <div className="h-4 w-3/4 skeleton rounded"></div>
                <div className="h-4 w-1/2 skeleton rounded"></div>
              </div>
            ))}

            {data?.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </main>
    </div>
  )
}

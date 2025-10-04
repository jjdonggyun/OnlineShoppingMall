import { useQuery } from '@tanstack/react-query'
import type { Product } from '../types/product'

export type UseProductsParams = {
  channel?: 'NEW' | 'BEST'
  category?: string
  /** 해시태그 필터 (상품의 tags 배열에 매칭) */
  tag?: string
  sort?: 'price-asc' | 'price-desc' | 'new'
  limit?: number
  page?: number
}

/** 판매중 상품 목록 조회 훅 */
export function useProducts(params: UseProductsParams = {}) {
  const { channel, category, tag, sort, limit, page } = params

  const qs = new URLSearchParams()
  if (channel) qs.set('channel', channel)
  if (category) qs.set('category', category)
  if (tag) qs.set('tag', tag)
  if (sort) qs.set('sort', sort)
  if (limit != null) qs.set('limit', String(limit))
  if (page != null) qs.set('page', String(page))

  return useQuery({
    // 캐시 키에 tag 포함!
    queryKey: ['products', { channel, category, tag, sort, limit, page }],
    queryFn: async () => {
      const r = await fetch(`/api/products?${qs.toString()}`)
      if (!r.ok) return [] as Product[]
      return r.json() as Promise<Product[]>
    },
  })
}

// src/stores/useCart.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type CartItem = {
  productId: string
  name: string
  price: number
  images: string[]
  qty: number
  /** 서버가 내려주는 '라인 인덱스'(UI 제어용) */
  line: number
  /** 소계 금액 = price * qty (렌더링은 이걸 사용) */
  linePrice?: number

  // 옵션(로그인/게스트 공통 표시용)
  variantIndex?: number
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

export type Cart = {
  id: string
  items: CartItem[]
  totalQty: number
  totalPrice: number
}

type CartOptionPayload = {
  variantIndex?: number
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

export function useCart() {
  const qc = useQueryClient()

  const cart = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const r = await fetch('/api/cart', { credentials: 'include' })
      if (!r.ok) throw new Error('UNAUTHORIZED')
      return r.json()
    },
  })

  const addItem = useMutation({
    mutationFn: async (payload: { productId: string; qty?: number; option?: CartOptionPayload }) => {
      const r = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error('ADD_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  /** 하위호환: productId의 '첫 매칭 라인'만 수정됨(옵션 라인 여러 개면 모호) */
  const updateQty = useMutation({
    mutationFn: async (payload: { productId: string; qty: number }) => {
      const r = await fetch(`/api/cart/items/${payload.productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qty: payload.qty }),
      })
      if (!r.ok) throw new Error('PATCH_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  // ✅ line 기준 수정
  const updateQtyByLine = useMutation({
    mutationFn: async (payload: { line: number; qty: number }) => {
      const r = await fetch(`/api/cart/items/line/${payload.line}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qty: payload.qty }),
      })
      if (!r.ok) throw new Error('PATCH_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  /** 하위호환: 해당 product의 모든 라인 삭제 */
  const removeItem = useMutation({
    mutationFn: async (productId: string) => {
      const r = await fetch(`/api/cart/items/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) throw new Error('DELETE_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  // ✅ line 기준 삭제
  const removeItemByLine = useMutation({
    mutationFn: async (line: number) => {
      const r = await fetch(`/api/cart/items/line/${line}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) throw new Error('DELETE_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const clear = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/cart/clear', {
        method: 'POST',
        credentials: 'include',
      })
      if (!r.ok) throw new Error('CLEAR_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  return { cart, addItem, updateQty, updateQtyByLine, removeItem, removeItemByLine, clear }
}

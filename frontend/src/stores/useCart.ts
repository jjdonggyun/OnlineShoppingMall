// src/stores/useCart.ts (또는 hooks/useCart.ts)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type CartItem = {
  productId: string
  name: string
  price: number
  images: string[]
  qty: number
  line: number

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
    // 로그인 안돼 있으면 자동 실패할 수 있으니, 필요시 enabled 옵션으로 로그인 상태에 따라 호출 제어 가능
  })

  const addItem = useMutation({
    mutationFn: async (payload: { productId: string; qty?: number; option?: CartOptionPayload }) => {
      const r = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload), // option도 함께 전송(백엔드가 받도록 구현하면 반영됨)
      })
      if (!r.ok) throw new Error('ADD_FAIL')
      return r.json() as Promise<Cart>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

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

  return { cart, addItem, updateQty, removeItem, clear }
}

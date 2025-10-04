// src/stores/useCartSmart.ts
import { useAuth } from '../stores/auth'
import { useCart } from './useCart'
import { useGuestCart } from './useGuestCart'

export type CartOption = {
  variantIndex?: number
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

export function useCartSmart() {
  const { user } = useAuth(s => ({ user: s.user }))
  const server = useCart()
  const guest = useGuestCart()
  const isLoggedIn = !!user

  return {
    isLoggedIn,
    data: isLoggedIn ? server.cart.data : null,
    isLoading: isLoggedIn ? server.cart.isLoading : false,
    guestItems: isLoggedIn ? [] : guest.items,

    // 동기 add
    add: (productId: string, qty = 1, opt?: CartOption) => {
      if (isLoggedIn) {
        // 서버 장바구니에도 옵션을 보낼 수 있게 payload 확장(백엔드 라우트에 맞춰 구현)
        server.addItem.mutate({ productId, qty, option: opt })
      } else {
        guest.add(productId, qty, opt) // ✅ 옵션 저장
      }
    },

    // 비동기 add
    addAsync: async (productId: string, qty = 1, opt?: CartOption) => {
      if (isLoggedIn) {
        await server.addItem.mutateAsync({ productId, qty, option: opt })
      } else {
        guest.add(productId, qty, opt) // ✅ 옵션 저장
        return Promise.resolve()
      }
    },

    setQty: (productId: string, qty: number) => {
      if (isLoggedIn) server.updateQty.mutate({ productId, qty })
      else guest.setQty(productId, qty)
    },
    remove: (productId: string) => {
      if (isLoggedIn) server.removeItem.mutate(productId)
      else guest.remove(productId)
    },
    clear: () => {
      if (isLoggedIn) server.clear.mutate()
      else guest.clear()
    },
    invalidate: () => {
      if (isLoggedIn) server.cart.refetch()
    },

    // 옵션 변경(게스트용 헬퍼)
    updateGuestOption: (productId: string, opt: CartOption) => {
      if (!isLoggedIn) guest.updateOption(productId, opt)
    },

    // 옵션 변경(서버용 헬퍼, 라우트 준비되면 사용)
    updateOption: async (productId: string, opt: CartOption) => {
      if (!isLoggedIn) return
      await fetch(`/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ option: opt }),
      })
      server.cart.refetch()
    }
  }
}

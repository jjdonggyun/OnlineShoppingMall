// useCartSmart.ts
import { useAuth } from '../stores/auth'
import { useCart } from './useCart'
import { useGuestCart } from './useGuestCart'

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

    // 기존 동기 add (그대로 유지)
    add: (productId: string, qty = 1) => {
      if (isLoggedIn) server.addItem.mutate({ productId, qty })
      else guest.add(productId, qty)
    },

    // ★ 추가: 비동기 add (성공/실패 await 가능)
    addAsync: async (productId: string, qty = 1) => {
      if (isLoggedIn) {
        await server.addItem.mutateAsync({ productId, qty })  // 성공/실패 throw
      } else {
        guest.add(productId, qty)
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
    }
  }
}

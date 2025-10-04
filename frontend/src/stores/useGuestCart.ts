// src/stores/useGuestCart.ts
import { create } from 'zustand'
import type { CartOption } from './useCartSmart'

type GuestItem = {
  productId: string
  qty: number
  // ✅ 평탄화된 옵션 필드(표시가 쉬움)
  variantIndex?: number
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

type GuestCartState = {
  items: GuestItem[]
  set: (fn: (prev: GuestItem[]) => GuestItem[]) => void
  add: (productId: string, qty?: number, opt?: CartOption) => void
  setQty: (productId: string, qty: number) => void
  updateOption: (productId: string, opt: CartOption) => void
  remove: (productId: string) => void
  clear: () => void
  load: () => void
  save: () => void
}

const KEY = 'guest_cart_v1'

export const useGuestCart = create<GuestCartState>((set, get) => ({
  items: [],
  set: (fn) => set(s => ({ items: fn(s.items) })),

  add: (productId, qty = 1, opt) => {
    const q = Math.max(1, qty)
    const items = get().items.slice()
    const i = items.findIndex(it => it.productId === productId)

    if (i >= 0) {
      // 같은 상품을 또 담을 땐 수량만 증가(옵션 바꾸려면 updateOption 사용)
      items[i].qty += q
    } else {
      items.push({
        productId,
        qty: q,
        ...opt, // ✅ color/size/variantIndex/sku/colorHex 저장
      })
    }
    set({ items }); get().save()
  },

  setQty: (productId, qty) => {
    const q = Math.max(0, qty)
    const items = get().items.slice()
    const i = items.findIndex(it => it.productId === productId)
    if (i < 0) return
    if (q === 0) items.splice(i, 1)
    else items[i].qty = q
    set({ items }); get().save()
  },

  updateOption: (productId, opt) => {
    const items = get().items.slice()
    const i = items.findIndex(it => it.productId === productId)
    if (i < 0) return
    items[i] = { ...items[i], ...opt } // ✅ 옵션만 갱신
    set({ items }); get().save()
  },

  remove: (productId) => {
    const items = get().items.filter(it => it.productId !== productId)
    set({ items }); get().save()
  },

  clear: () => { set({ items: [] }); localStorage.removeItem(KEY) },

  load: () => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const items = JSON.parse(raw) as GuestItem[]
      set({ items: Array.isArray(items) ? items : [] })
    } catch {}
  },

  save: () => {
    try { localStorage.setItem(KEY, JSON.stringify(get().items)) } catch {}
  }
}))

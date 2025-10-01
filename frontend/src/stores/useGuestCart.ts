import { create } from 'zustand'

type GuestItem = { productId: string; qty: number }
type GuestCartState = {
  items: GuestItem[]
  set: (fn: (prev: GuestItem[]) => GuestItem[]) => void
  add: (productId: string, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  load: () => void
  save: () => void
}

const KEY = 'guest_cart_v1'

export const useGuestCart = create<GuestCartState>((set, get) => ({
  items: [],
  set: (fn) => set(s => ({ items: fn(s.items) })),
  add: (productId, qty = 1) => {
    const q = Math.max(1, qty)
    const items = get().items.slice()
    const i = items.findIndex(it => it.productId === productId)
    if (i >= 0) items[i].qty += q
    else items.push({ productId, qty: q })
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

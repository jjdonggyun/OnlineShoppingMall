import type Cart from '../models/Cart'
import Product from '../models/Product'

export async function hydrateCart(cartDoc: any) {
  // items.product 를 실제 Product로 채워서(=populate) 클라이언트가 바로 쓰기 쉽게 변환
  await cartDoc.populate('items.product')
  const items = cartDoc.items.map((it: any) => {
    const p = it.product
    return {
      productId: String(p._id),
      name: p.name,
      price: p.price,
      images: Array.isArray(p.images) ? p.images : [],
      qty: it.qty,
      line: p.price * it.qty,
    }
  })
  const totalQty = items.reduce((s: number, it: any) => s + it.qty, 0)
  const totalPrice = items.reduce((s: number, it: any) => s + it.line, 0)
  return { id: String(cartDoc._id), items, totalQty, totalPrice }
}

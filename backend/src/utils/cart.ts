// utils/cart.ts
import type Cart from '../models/Cart'
import Product from '../models/Product'

export async function hydrateCart(cartDoc: any) {
  await cartDoc.populate('items.product')

  let totalQty = 0
  let totalPrice = 0

  const items = (cartDoc.items ?? []).map((it: any, idx: number) => {
    const p = it.product || {}

    // ✅ price를 안전하게 숫자로 보정 (문자/콤마/원 제거 케이스 포함)
    const raw = p?.price
    const price =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw.replace(/[^\d.-]/g, '')) || 0
          : 0

    const qty = Number(it?.qty ?? 0) || 0
    const linePrice = price * qty

    totalQty += qty
    totalPrice += linePrice

    return {
      productId: String(p?._id ?? it.product),
      name: p?.name ?? '(삭제된 상품)',
      price,                                  // 단가
      images: Array.isArray(p?.images) ? p.images : [],
      qty,

      line: idx,                              // ✅ 프론트 제어용 인덱스
      linePrice,                              // ✅ 소계(표시/합산에 이거 사용)

      // ✅ 옵션 평탄화
      variantIndex: it.option?.variantIndex,
      color: it.option?.color,
      colorHex: it.option?.colorHex,
      size: it.option?.size,
      sku: it.option?.sku,
    }
  })

  return { id: String(cartDoc._id), items, totalQty, totalPrice }
}

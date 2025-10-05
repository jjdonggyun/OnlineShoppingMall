// src/types/product.ts
export type VariantSize = { name: string; stock?: number; sku?: string }
export type Variant = { color: string; colorHex?: string; coverImage?: string; sizes?: VariantSize[] }

export type Product = {
  id: string
  productNo?: string | null
  name: string
  price: number
  images: string[]
  description?: string
  status: 'ACTIVE'|'SOLD_OUT'
  categories?: string[]
  variants?: Variant[]
  swatches?: { color: string; colorHex?: string | null; image?: string | null }[]
  /** ✅ 배지 제거 방향: 화면에선 쓰지 않음(하위호환 차원에서 optional 유지만) */
  badge?: string
  /** ✅ 이제 이걸 UI 배지로 사용 */
  tags?: string[]   // ← TAG 해시태그의 value 목록
  overrides?: { isNew?: boolean; isBest?: boolean }
  metrics?: { sold30d?: number; view7d?: number }
  createdAt?: string
  updatedAt?: string
}

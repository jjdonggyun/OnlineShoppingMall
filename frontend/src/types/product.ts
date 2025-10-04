// src/types/product.ts
export type VariantSize = { name: string; stock?: number; sku?: string }
export type Variant = { color: string; colorHex?: string; coverImage?: string; sizes: VariantSize[] }

export type Product = {
  id: string
  productNo?: string | null
  name: string
  price: number
  images: string[]
  badge?: string
  description?: string
  status: 'ACTIVE' | 'SOLD_OUT'
  categories: string[]
  variants?: Variant[]
  swatches?: Array<{ color: string; colorHex?: string; image?: string }>

  // 채널 메타(옵션)
  tags?: string[]
  overrides?: { isNew?: boolean; isBest?: boolean }
  metrics?: { sold30d?: number; view7d?: number }
  createdAt?: string
  updatedAt?: string
}

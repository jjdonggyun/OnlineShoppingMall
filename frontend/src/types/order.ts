export type AdminOrderItem = {
  productId: string
  name: string
  image: string | null
  price: number
  qty: number
  option?: {
    variantIndex?: number
    color?: string
    colorHex?: string
    size?: string
    sku?: string
  }
}

export type AdminOrderShipping = {
  courierCode?: string | null
  courierName?: string | null
  trackingNumber?: string | null
  status?: 'READY'|'SHIPPING'|'DELIVERED'
}

export type AdminOrder = {
  id: string
  status: 'PENDING' | 'PAID' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'
  totalPrice: number
  paymentMethod: string
  createdAt: string
  user: {
    id: string
    email: string
    userId: string
    name: string
    phone: string
    role: 'USER' | 'ADMIN'
  } | null
  items: AdminOrderItem[]

  shipping?: AdminOrderShipping
}

export type AdminOrderListResp = {
  page: number
  limit: number
  total: number
  pages: number
  items: AdminOrder[]
}
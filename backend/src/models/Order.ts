// models/Order.ts
import { Schema, model, Types, Document } from 'mongoose'

/** ───────── Item ───────── */
export interface IOrderItem {
  product: Types.ObjectId
  qty: number
  price: number
  option?: {
    variantIndex?: number
    color?: string
    colorHex?: string
    size?: string
    sku?: string
  }
}

/** ───────── Payment / Shipping ───────── */
export type PaymentMethod = 'CARD' | 'VIRTUAL' | 'TRANSFER' | 'MOBILE' | 'ETC'
export type PaymentProvider = 'TOSS' | 'IAMPORT' | 'PORTONE' | 'ETC'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED'

export interface IOrderPayment {
  method: PaymentMethod
  provider?: PaymentProvider
  status: PaymentStatus
  orderKey?: string | null           // PG 주문/결제 키 (예: 토스 paymentKey)
  pgTransactionId?: string | null    // PG 내부 트랜잭션 키
  receiptUrl?: string | null
  paidAt?: Date | null
  failureMsg?: string | null
}

export type ShippingStatus = 'READY' | 'SHIPPING' | 'DELIVERED'

export interface IOrderShipping {
  courierCode?: string | null        // 예: CJ, LOTTE, HANJIN...
  courierName?: string | null
  trackingNumber?: string | null
  shippedAt?: Date | null
  deliveredAt?: Date | null
  lastCheckpoint?: string | null
  status: ShippingStatus
}

/** ───────── Order ───────── */
export interface IOrder extends Document {
  user: Types.ObjectId
  items: IOrderItem[]
  totalPrice: number

  /** 확장된 결제/배송 */
  payment: IOrderPayment
  shipping: IOrderShipping

  /**
   * ↓↓ 호환용(기존 코드 유지 목적)
   * paymentMethod: 기본 결제수단(표시용), 실제 상태는 payment.* 참조
   * status: UI 단순 표기용. save 직전에 payment/shipping을 기준으로 자동 동기화됨.
   */
  paymentMethod: string
  status: 'PENDING' | 'PAID' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'

  createdAt: Date
  updatedAt: Date
}

/** ───────── Schemas ───────── */
const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  option: {
    variantIndex: Number,
    color: String,
    colorHex: String,
    size: String,
    sku: String,
  }
}, { _id: false })

const paymentSchema = new Schema<IOrderPayment>({
  method: { type: String, default: 'CARD' },
  provider: { type: String, default: 'TOSS' },
  status: {
    type: String,
    enum: ['PENDING','PAID','FAILED','CANCELLED','REFUNDED'],
    default: 'PENDING',
    index: true
  },
  orderKey: { type: String, default: null },
  pgTransactionId: { type: String, default: null },
  receiptUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
  failureMsg: { type: String, default: null },
}, { _id: false })

const shippingSchema = new Schema<IOrderShipping>({
  courierCode: { type: String, default: null },
  courierName: { type: String, default: null },
  trackingNumber: { type: String, default: null },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  lastCheckpoint: { type: String, default: null },
  status: {
    type: String,
    enum: ['READY','SHIPPING','DELIVERED'],
    default: 'READY',
    index: true
  },
}, { _id: false })

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], default: [] },
  totalPrice: { type: Number, required: true, min: 0 },

  payment: { type: paymentSchema, default: () => ({}) },
  shipping: { type: shippingSchema, default: () => ({}) },

  // ── 호환 필드(기존 코드용)
  paymentMethod: { type: String, default: 'CARD' },
  status: {
    type: String,
    enum: ['PENDING','PAID','SHIPPING','DELIVERED','CANCELLED'],
    default: 'PENDING',
    index: true
  },
}, { timestamps: true })

/** ───────── Legacy status 동기화 ─────────
 * 저장 직전에 단일 status를 payment/shipping 기준으로 자동 보정한다.
 * 규칙:
 * - payment.status === 'PENDING'        → 'PENDING'
 * - payment.status === 'CANCELLED'      → 'CANCELLED'
 * - payment.status === 'FAILED'         → 'CANCELLED' (실패는 취소로 간주)
 * - payment.status in ['PAID','REFUNDED'] 이고 배송:
 *    - shipping.status === 'DELIVERED'  → 'DELIVERED'
 *    - shipping.status === 'SHIPPING'   → 'SHIPPING'
 *    - else                             → 'PAID'
 */
orderSchema.pre('save', function(next) {
  const o = this as any
  const pay = o.payment?.status || 'PENDING'
  const ship = o.shipping?.status || 'READY'

  let legacy: 'PENDING'|'PAID'|'SHIPPING'|'DELIVERED'|'CANCELLED' = 'PENDING'

  // 결제 취소/실패는 최우선
  if (pay === 'CANCELLED' || pay === 'FAILED') {
    legacy = 'CANCELLED'
  } else if (ship === 'DELIVERED') {
    legacy = 'DELIVERED'
  } else if (ship === 'SHIPPING') {
    legacy = 'SHIPPING'
  } else if (pay === 'PAID' || pay === 'REFUNDED') {
    legacy = 'PAID'
  } else {
    legacy = 'PENDING'
  }

  o.status = legacy
  if (o.payment?.method) o.paymentMethod = o.payment.method
  next()
})

/** ───────── Indexes ───────── */
orderSchema.index({ createdAt: -1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ 'payment.status': 1, createdAt: -1 })
orderSchema.index({ 'shipping.status': 1, createdAt: -1 })

export default model<IOrder>('Order', orderSchema)

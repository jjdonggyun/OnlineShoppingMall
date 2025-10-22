import { Schema, model, Types, Document } from 'mongoose'

interface IOrderItem {
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

export interface IOrder extends Document {
  user: Types.ObjectId
  items: IOrderItem[]
  totalPrice: number
  paymentMethod: string
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  option: {
    variantIndex: Number,
    color: String,
    colorHex: String,
    size: String,
    sku: String,
  }
}, { _id: false })

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, default: 'CARD' },
  status: {
  type: String,
  enum: ['PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
  default: 'PENDING'
}
}, { timestamps: true })

export default model<IOrder>('Order', orderSchema)

// models/Cart.ts
import { Schema, model, Types, Document } from 'mongoose'

export interface ICartItemOption {
  variantIndex?: number
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

export interface ICartItem {
  product: Types.ObjectId
  qty: number
  option?: ICartItemOption   // ✅ 추가
}

export interface ICart extends Document {
  user: Types.ObjectId
  items: ICartItem[]
  createdAt: Date
  updatedAt: Date
}

const optionSchema = new Schema<ICartItemOption>({
  variantIndex: Number,
  color: String,
  colorHex: String,
  size: String,
  sku: String,
}, { _id: false })

const cartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  option: { type: optionSchema, default: undefined }, // ✅ 추가
})

const cartSchema = new Schema<ICart>({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true })

export default model<ICart>('Cart', cartSchema)

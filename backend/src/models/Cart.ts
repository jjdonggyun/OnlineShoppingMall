// 유저별로 1개의 카트 문서만 유지
// 아이템은 (product, qty) 구조
// 응답 계산 시 populate로 상품 정보를 합쳐 총액 계산

import { Schema, model, Types, Document } from 'mongoose'

export interface ICartItem {
  product: Types.ObjectId
  qty: number
}

export interface ICart extends Document {
  user: Types.ObjectId
  items: ICartItem[]
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
})

const cartSchema = new Schema<ICart>({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true })

export default model<ICart>('Cart', cartSchema)

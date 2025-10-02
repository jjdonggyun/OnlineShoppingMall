// models/Product.ts
import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  images:{ type: [String], default: [] },
  badge: { type: String },
  description: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE','SOLD_OUT'], default: 'ACTIVE', index: true },

  // ★ 추가: 다중 카테고리 (중복 허용)
  categories: { type: [String], default: [], index: true }
}, { timestamps: true })

export default model('Product', productSchema)

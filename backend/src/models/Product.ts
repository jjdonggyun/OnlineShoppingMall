import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  name:  { type: String, required: true },
  price: { type: Number, required: true },
  images:{ type: [String], default: [] },  // ← 단일 image → 다중 images
  badge: { type: String },
  description: { type: String, default: '' } // 선택
}, { timestamps: true })

export default model('Product', productSchema)

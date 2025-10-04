import { Schema, model } from 'mongoose'

const sizeSchema = new Schema({
  name:  { type: String, required: true },
  stock: { type: Number, default: 0 },
  sku:   { type: String },
}, { _id: false })

const variantSchema = new Schema({
  color:      { type: String, required: true },
  colorHex:   { type: String },
  coverImage: { type: String },
  sizes:      { type: [sizeSchema], default: [] }
}, { _id: false })

const productSchema = new Schema({
  // 기본
  productNo:   { type: String, index: true },
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  images:      { type: [String], default: [] },
  badge:       { type: String },
  description: { type: String, default: '' },

  // 상태
  status:  { type: String, enum: ['ACTIVE','SOLD_OUT'], default: 'ACTIVE', index: true },
  visible: { type: Boolean, default: true, index: true }, // ★ 추가

  // 분류
  categories: { type: [String], default: [], index: true },

  // 옵션
  variants: { type: [variantSchema], default: [] },

  // 메타
  tags: { type: [String], default: [], index: true },
  overrides: {
    isNew:  { type: Boolean, default: false, index: true },
    isBest: { type: Boolean, default: false, index: true },
  },
  metrics: {
    sold30d: { type: Number, default: 0, index: true },
    view7d:  { type: Number, default: 0 },
  },
}, { timestamps: true })

productSchema.index({ createdAt: -1 })
productSchema.index({ visible: -1, 'overrides.isBest': -1, 'metrics.sold30d': -1 })
productSchema.index({ visible: -1, 'overrides.isNew': -1, createdAt: -1 })

export default model('Product', productSchema)

import { Schema, model } from 'mongoose'

// MongoDB 컬렉션 스키마 정의 (Mendix의 엔티티 정의와 유사)
const productSchema = new Schema({
  name:  { type: String, required: true },           // 상품명 (필수)
  price: { type: Number, required: true },           // 가격 (필수)
  images:{ type: [String], default: [] },            // 다중 이미지 경로 리스트
  badge: { type: String },                           // NEW/BEST 등 라벨
  description: { type: String, default: '' },         // 상세설명 (선택)
  status: { type: String, enum: ['ACTIVE','SOLD_OUT'], default: 'ACTIVE', index: true }
}, { timestamps: true })                              // createdAt/updatedAt 자동

export default model('Product', productSchema)        // Mendix의 Persistable 엔티티와 유사

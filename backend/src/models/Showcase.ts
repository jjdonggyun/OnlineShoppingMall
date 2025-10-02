// models/Showcase.ts
import { Schema, model, Types } from 'mongoose'

export type ShowcaseName = 'RECOMMENDED' | 'SEASONAL' | 'BEST'

const showcaseSchema = new Schema({
  name: { type: String, enum: ['RECOMMENDED', 'SEASONAL', 'BEST'], unique: true, required: true },
  // 표시 순서대로 담긴 상품 ObjectId 배열
  items: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true })

export default model('Showcase', showcaseSchema)

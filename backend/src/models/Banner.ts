// models/Banner.ts
import { Schema, model, Document } from 'mongoose'

export interface IBanner extends Document {
  title?: string
  image: string
  link?: string
  active: boolean
  order: number
  startsAt: Date | null
  endsAt: Date | null
  // ↓↓↓ timestamps 추가
  createdAt: Date
  updatedAt: Date
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String },
    image: { type: String, required: true },
    link:  { type: String },
    active:{ type: Boolean, default: true },
    order: { type: Number,  default: 1000 },
    startsAt: { type: Date, default: null },
    endsAt:   { type: Date, default: null },
  },
  { timestamps: true } // ★ createdAt/updatedAt 자동 생성
)

export default model<IBanner>('Banner', BannerSchema)

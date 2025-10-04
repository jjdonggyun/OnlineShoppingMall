// models/Banner.ts
import { Schema, model, Document } from 'mongoose'

export type BannerDevice = 'ALL' | 'WEB' | 'MOBILE'

export interface IBanner extends Document {
  title?: string
  image: string              // 기본(웹)용 or 공용
  imageMobile?: string       // 모바일 전용 이미지(선택)
  link?: string
  active: boolean
  order: number
  startsAt: Date | null
  endsAt: Date | null
  device: BannerDevice       // 노출 대상
  createdAt: Date
  updatedAt: Date
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String },
    image: { type: String, required: true },
    imageMobile: { type: String },
    link:  { type: String },
    active:{ type: Boolean, default: true },
    order: { type: Number,  default: 1000 },
    startsAt: { type: Date, default: null },
    endsAt:   { type: Date, default: null },
    device: { type: String, enum: ['ALL','WEB','MOBILE'], default: 'ALL' },
  },
  { timestamps: true }
)

export default model<IBanner>('Banner', BannerSchema)

import { Schema, model } from 'mongoose'

/** 메인 섹션 및 내비에 노출할 해시태그 정의
 *  type:
 *   - MENU: Nav 상단 메뉴에 노출할 항목 (value=카테고리명)
 *   - CATEGORY: 상품 목록 칩(카테고리 필터)
 *   - TAG:      상품 목록 칩(태그 필터)
 *   - CHANNEL:  NEW/BEST 등 채널
 */
const hashtagSchema = new Schema({
  label:   { type: String, required: true },                        // 노출 텍스트
  emoji:   { type: String },                                        // 선택 (예: 🍂)
  type:    { type: String, enum: ['MENU','CATEGORY','TAG','CHANNEL'], required: true, index: true },
  value:   { type: String, required: true },                        // MENU/CATEGORY/TAG: 해당 값, CHANNEL: NEW|BEST
  active:  { type: Boolean, default: true, index: true },           // 노출 여부
  order:   { type: Number, default: 0, index: true },               // 정렬 순서 (낮을수록 먼저)
}, { timestamps: true })

export type HashtagDoc = {
  _id: any
  label: string
  emoji?: string
  type: 'MENU'|'CATEGORY'|'TAG'|'CHANNEL'
  value: string
  active: boolean
  order: number
}

export default model('Hashtag', hashtagSchema)

import { Schema, model } from 'mongoose'

/** 메인 섹션에 노출할 해시태그 정의 */
const hashtagSchema = new Schema({
  label:   { type: String, required: true },                        // 칩에 보일 텍스트 (예: 귀여운 스타일)
  emoji:   { type: String },                                        // 선택 (예: 🍂)
  type:    { type: String, enum: ['CATEGORY','TAG','CHANNEL'], required: true },
  value:   { type: String, required: true },                        // CATEGORY/TAG면 해당 값, CHANNEL은 NEW|BEST
  active:  { type: Boolean, default: true, index: true },           // 노출 여부
  order:   { type: Number, default: 0, index: true },               // 정렬 순서 (낮을수록 먼저)
}, { timestamps: true })

export type HashtagDoc = {
  _id: any; label: string; emoji?: string;
  type: 'CATEGORY'|'TAG'|'CHANNEL';
  value: string; active: boolean; order: number;
}

export default model('Hashtag', hashtagSchema)

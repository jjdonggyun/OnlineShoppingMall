import { Schema, model, Document } from 'mongoose'

// TypeScript 타입 (Mendix의 엔티티 속성 정의를 코드로 표현)
export interface IUser extends Document {
  email: string
  passwordHash: string
  role: 'USER' | 'ADMIN'
  tokenVersion: number
  // 이메일 인증 관련 필드
  emailVerified: boolean
  verificationToken?: string | null
  verificationTokenExpires?: Date | null
}

const userSchema = new Schema<IUser>({
  // 이메일: 유니크, 인덱스, 소문자 정규화, 트림
  email: { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
  // 비밀번호 해시(원문 저장 금지)
  passwordHash: { type: String, required: true },
  // 역할: USER/ADMIN
  role: { type: String, enum: ['USER','ADMIN'], default: 'USER', index: true },
  // 토큰 버전: 리프레시 토큰 무효화(강제 로그아웃/보안)
  tokenVersion: { type: Number, default: 0 },

  // 이메일 인증 상태/토큰/만료시각
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpires: { type: Date, default: null },
}, { timestamps: true })

export default model<IUser>('User', userSchema)

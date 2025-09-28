import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  passwordHash: string
  role: 'USER' | 'ADMIN'
  tokenVersion: number
  // ↓ 신규(이메일 인증)
  emailVerified: boolean
  verificationToken?: string | null
  verificationTokenExpires?: Date | null
}

const userSchema = new Schema<IUser>({
  email: { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['USER','ADMIN'], default: 'USER', index: true },
  tokenVersion: { type: Number, default: 0 },

  // ↓ 추가된 컬럼들
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpires: { type: Date, default: null },
}, { timestamps: true })

export default model<IUser>('User', userSchema)

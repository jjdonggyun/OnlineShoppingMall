// models/User.ts
import { Schema, model, Document, Types } from 'mongoose'

export interface IUser extends Document {
  email: string
  passwordHash: string
  role: 'USER' | 'ADMIN'
  tokenVersion: number
  name: string
  userId: string
  phone: string
  birth?: Date | null
  smsOptIn: boolean
  emailOptIn: boolean
  recommenderId?: string | null

  // ★ 추가
  wishlist: Types.ObjectId[]
}

const userSchema = new Schema<IUser>({
  email: { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['USER','ADMIN'], default: 'USER', index: true },
  tokenVersion: { type: Number, default: 0 },
  name: { type: String, required: true, trim: true },
  userId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  birth: { type: Date, default: null },
  smsOptIn: { type: Boolean, default: true },
  emailOptIn: { type: Boolean, default: true },
  recommenderId: { type: String, default: null, trim: true },

  // ★ 추가
  wishlist: { type: [Schema.Types.ObjectId], ref: 'Product', default: [], index: true },
}, { timestamps: true })

export default model<IUser>('User', userSchema)

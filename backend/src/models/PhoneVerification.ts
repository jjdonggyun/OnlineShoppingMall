import { Schema, model, Document } from 'mongoose'

export interface IPhoneVerification extends Document {
  phone: string               // '010-1234-5678' 등
  codeHash: string            // bcrypt hash
  expiresAt: Date
  attempts: number
  verified: boolean
}

const schema = new Schema<IPhoneVerification>({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
}, { timestamps: true })

export default model<IPhoneVerification>('PhoneVerification', schema)

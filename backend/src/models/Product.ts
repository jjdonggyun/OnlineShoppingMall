import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  badge: { type: String },
}, { timestamps: true })

export default model('Product', productSchema)

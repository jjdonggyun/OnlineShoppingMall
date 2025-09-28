import { Router } from 'express'
import Product from '../models/Product'
import { requireAuth, requireRole } from '../auth'

const r = Router()

// 공개 목록
r.get('/', async (_req, res)=> {
  const list = await Product.find().limit(24).lean()
  res.json(list.map(p => ({
    id: String(p._id),
    name: p.name,
    price: p.price,
    image: p.image,
    badge: p.badge
  })))
})

// 관리자만 생성
r.post('/', requireAuth, requireRole('ADMIN'), async (req,res)=>{
  const { name, price, image, badge } = req.body
  const p = await Product.create({ name, price, image, badge })
  res.status(201).json({ id: String(p._id) })
})

export default r

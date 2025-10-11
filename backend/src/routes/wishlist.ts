// routes/wishlist.ts
import { Router } from 'express'
import { requireAuth } from '../auth'
import User from '../models/User'
import Product from '../models/Product'
import mongoose from 'mongoose'

const r = Router()

// 내 위시리스트 productId 배열 (가볍게)
r.get('/ids', requireAuth as any, async (req: any, res) => {
  const u = await User.findById(req.user!.uid, { wishlist: 1 }).lean()
  res.json((u?.wishlist ?? []).map(String))
})

// 상세 상품까지 같이 받고 싶을 때 (?populate=1)
r.get('/', requireAuth as any, async (req: any, res) => {
  const populate = String(req.query.populate || '') === '1'
  const u = await User.findById(req.user!.uid, { wishlist: 1 }).lean()
  const ids = (u?.wishlist ?? []) as mongoose.Types.ObjectId[]

  if (!populate) return res.json(ids.map(String))

  // 필요한 필드만
  const list = await Product.find({ _id: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean()

  res.json(list.map(p => ({
    id: String(p._id),
    productNo: p.productNo || null,
    name: p.name,
    price: p.price,
    images: p.images || [],
    badge: p.badge,
    status: p.status,
    categories: p.categories || [],
    swatches: (p.variants ?? []).map((v: any) => ({
      color: v.color, colorHex: v.colorHex || null,
      image: v.coverImage || (Array.isArray(p.images) && p.images[0]) || null
    }))
  })))
})

// 추가
r.post('/:productId', requireAuth as any, async (req: any, res) => {
  const { productId } = req.params
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: 'BAD_ID' })
  await User.updateOne(
    { _id: req.user!.uid },
    { $addToSet: { wishlist: new mongoose.Types.ObjectId(productId) } }
  )
  res.json({ ok: true })
})

// 제거
r.delete('/:productId', requireAuth as any, async (req: any, res) => {
  const { productId } = req.params
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: 'BAD_ID' })
  await User.updateOne(
    { _id: req.user!.uid },
    { $pull: { wishlist: new mongoose.Types.ObjectId(productId) } }
  )
  res.json({ ok: true })
})

export default r

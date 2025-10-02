// routes/collections.ts
import { Router } from 'express'
import { requireAuth, requireRole } from '../auth'
import Showcase from '../models/Showcase'
import Product from '../models/Product'
import mongoose from 'mongoose'

const r = Router()

const NAMES = ['RECOMMENDED','SEASONAL','BEST'] as const
type Name = typeof NAMES[number]

async function ensure(name: Name) {
  let doc = await Showcase.findOne({ name })
  if (!doc) doc = await Showcase.create({ name, items: [] })
  return doc
}

// 공개: 컬렉션에 담긴 상품들(판매중만), populate + 정렬 유지
r.get('/:name', async (req, res) => {
  const name = req.params.name?.toUpperCase()
  if (!NAMES.includes(name as Name)) return res.status(400).json({ error: 'BAD_COLLECTION' })

  const sc = await ensure(name as Name)
  // 판매중만 필터링
  const prods = await Product.find({ _id: { $in: sc.items }, status: 'ACTIVE' }).lean()
  // 원래 순서 유지
  const order = new Map(sc.items.map((id, i) => [String(id), i]))
  prods.sort((a, b) => (order.get(String(a._id))! - order.get(String(b._id))!))

  res.json(prods.map(p => ({
    id: String(p._id),
    name: p.name,
    price: p.price,
    images: Array.isArray(p.images) ? p.images : [],
    badge: p.badge,
    status: p.status
  })))
})

// 관리자: 상품 추가 (끝에 append)
r.post('/:name/items', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const name = req.params.name?.toUpperCase()
  const { productId } = req.body || {}
  if (!NAMES.includes(name as Name)) return res.status(400).json({ error: 'BAD_COLLECTION' })
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: 'BAD_ID' })

  const prod = await Product.findById(productId)
  if (!prod) return res.status(404).json({ error: 'NOT_FOUND' })

  const sc = await ensure(name as Name)
  if (!sc.items.find(i => String(i) === String(productId))) sc.items.push(productId)
  await sc.save()
  res.json({ ok: true })
})

// 관리자: 상품 제거
r.delete('/:name/items/:productId', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const name = req.params.name?.toUpperCase()
  const { productId } = req.params
  if (!NAMES.includes(name as Name)) return res.status(400).json({ error: 'BAD_COLLECTION' })
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: 'BAD_ID' })

  const sc = await ensure(name as Name)
  sc.items = sc.items.filter(i => String(i) !== String(productId))
  await sc.save()
  res.json({ ok: true })
})

export default r

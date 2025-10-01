// routes/products.ts
import { Router } from 'express'
import Product from '../models/Product'
import { requireAuth, requireRole } from '../auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const r = Router()

// --- 업로드 설정 ---
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
})
const upload = multer({ storage })

// ★ 공개 목록: "판매중(ACTIVE)"만 노출
r.get('/', async (_req, res) => {
  const list = await Product.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(24).lean()
  res.json(list.map(p => {
    const images: string[] =
      Array.isArray(p.images) && p.images.length > 0
        ? p.images
        : (p as any).image ? [(p as any).image] : []
    return {
      id: String(p._id),
      name: p.name,
      price: p.price,
      images,
      badge: p.badge,
      status: p.status,
    }
  }))
})

// 단건 조회(상태 무관) - 상세 페이지에서 품절 표시 가능
r.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).lean()
  if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
  const images: string[] =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p as any).image ? [(p as any).image] : []
  res.json({
    id: String(p._id),
    name: p.name,
    price: p.price,
    images,
    badge: p.badge,
    description: p.description ?? '',
    status: p.status,
    createdAt: p.createdAt, updatedAt: p.updatedAt
  })
})

// 생성 (ADMIN 전용)
r.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  upload.array('images', 10),
  async (req, res) => {
    const { name, price, badge, description } = req.body
    if (!name || !price) return res.status(400).json({ error: 'BAD_REQUEST' })

    const files = (req.files as Express.Multer.File[]) ?? []
    const images = files.map(f => `/uploads/${f.filename}`)

    const p = await Product.create({
      name,
      price: Number(price),
      images,
      badge: badge || undefined,
      description: description || '',
      status: 'ACTIVE',
    })
    res.status(201).json({ id: String(p._id) })
  }
)

// ★ 편집(ADMIN): 일부 필드 수정 + 이미지 교체(있으면)
r.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  upload.array('images', 10), // 새 이미지 업로드 시 교체
  async (req, res) => {
    const { name, price, badge, description, status } = req.body
    const update: any = {}
    if (name !== undefined) update.name = name
    if (price !== undefined) update.price = Number(price)
    if (badge !== undefined) update.badge = badge || undefined
    if (description !== undefined) update.description = description || ''
    if (status !== undefined) {
      if (!['ACTIVE','SOLD_OUT'].includes(status)) {
        return res.status(400).json({ error: 'BAD_STATUS' })
      }
      update.status = status
    }

    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length > 0) {
      update.images = files.map(f => `/uploads/${f.filename}`)
    }

    const p = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    return res.json({ ok: true })
  }
)

// ★ 상태만 토글(ADMIN): 간편 엔드포인트
r.post('/:id/status', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { status } = req.body || {}
  if (!['ACTIVE','SOLD_OUT'].includes(status)) {
    return res.status(400).json({ error: 'BAD_STATUS' })
  }
  const p = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true })
  if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
  return res.json({ ok: true })
})

// ★ 품절 목록(ADMIN 전용)
r.get('/admin/soldout/list', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const list = await Product.find({ status: 'SOLD_OUT' }).sort({ updatedAt: -1 }).lean()
  res.json(list.map(p => ({
    id: String(p._id),
    name: p.name,
    price: p.price,
    images: Array.isArray(p.images) ? p.images : [],
    badge: p.badge,
    status: p.status,
    updatedAt: p.updatedAt,
  })))
})

// 삭제 (ADMIN 전용)
r.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const found = await Product.findById(req.params.id)
  if (!found) return res.status(404).json({ error: 'NOT_FOUND' })
  await Product.deleteOne({ _id: req.params.id })
  res.json({ ok: true })
})

export default r

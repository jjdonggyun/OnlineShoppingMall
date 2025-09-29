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

// 공개 목록
r.get('/', async (_req, res) => {
  const list = await Product.find().sort({ createdAt: -1 }).limit(24).lean()
  res.json(list.map(p => {
    const images: string[] =
      Array.isArray(p.images) && p.images.length > 0
        ? p.images
        : (p as any).image ? [(p as any).image] : [] // ← 구문서 호환
    return {
      id: String(p._id),
      name: p.name,
      price: p.price,
      images,                 // ← 다중 이미지
      badge: p.badge
    }
  }))
})

// 단건 조회
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
    createdAt: p.createdAt, updatedAt: p.updatedAt
  })
})

// 생성 (ADMIN 전용) - 멀터 다중 파일
r.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  upload.array('images', 10),          // ← input name="images"
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
      description: description || ''
    })
    res.status(201).json({ id: String(p._id) })
  }
)

// 삭제 (ADMIN 전용)
r.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const found = await Product.findById(req.params.id)
  if (!found) return res.status(404).json({ error: 'NOT_FOUND' })
  await Product.deleteOne({ _id: req.params.id })
  // (선택) 파일 삭제는 실제 운영에서 안전하게 처리할 정책을 정한 뒤 구현 권장
  res.json({ ok: true })
})

export default r

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

// --- 유틸: 카테고리 정규화 ---
function normalizeCategories(input: any): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input
      .flatMap(v => String(v).split(','))
      .map(s => s.trim())
      .filter(Boolean)
  }
  return String(input).split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * ===========================
 *   고정 경로 (먼저 선언)
 * ===========================
 */

// 공개 목록: ACTIVE만, 카테고리/개수 필터
r.get('/', async (req, res) => {
  try {
    const { category, limit } = req.query as { category?: string; limit?: string }
    const q: any = { status: 'ACTIVE' }
    if (category && category !== 'ALL') q.categories = category
    const lim = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 24

    const list = await Product.find(q).sort({ createdAt: -1 }).limit(lim).lean()
    res.json(
      list.map(p => ({
        id: String(p._id),
        name: p.name,
        price: p.price,
        images: Array.isArray(p.images) ? p.images : [],
        badge: (p as any).badge,
        status: p.status,
        categories: Array.isArray((p as any).categories) ? (p as any).categories : []
      }))
    )
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 공개용 카테고리 목록 (판매중 기준)
r.get('/categories', async (_req, res) => {
  try {
    const cats = await Product.find({ status: 'ACTIVE' }).distinct('categories')
    res.json(cats.filter(Boolean).sort())
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 관리자: 카테고리 전체(distinct)
r.get('/admin/categories/distinct', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const cats = await Product.distinct('categories')
    res.json(cats.sort())
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 관리자: 품절 목록
r.get('/admin/soldout/list', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const list = await Product.find({ status: 'SOLD_OUT' }).sort({ updatedAt: -1 }).lean()
    res.json(
      list.map(p => ({
        id: String(p._id),
        name: p.name,
        price: p.price,
        images: Array.isArray(p.images) ? p.images : [],
        badge: p.badge,
        status: p.status,
        updatedAt: p.updatedAt,
        categories: Array.isArray((p as any).categories) ? (p as any).categories : []
      }))
    )
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

/**
 * ===========================
 *   생성/수정/상태/삭제
 * ===========================
 */

// 생성 (ADMIN)
r.post('/', requireAuth, requireRole('ADMIN'), upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, badge, description } = req.body
    if (!name || !price) return res.status(400).json({ error: 'BAD_REQUEST' })

    const categories = normalizeCategories(req.body.categories)
    const files = (req.files as Express.Multer.File[]) ?? []
    const images = files.map(f => `/uploads/${f.filename}`)

    const p = await Product.create({
      name,
      price: Number(price),
      images,
      badge: badge || undefined,
      description: description || '',
      status: 'ACTIVE',
      categories
    })
    res.status(201).json({ id: String(p._id) })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 편집 (ADMIN) - 일부 필드 + 이미지 교체(있으면)
r.patch('/:id([0-9a-fA-F]{24})', requireAuth, requireRole('ADMIN'), upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, badge, description, status } = req.body
    const update: any = {}

    if (name !== undefined) update.name = name
    if (price !== undefined) update.price = Number(price)
    if (badge !== undefined) update.badge = badge || undefined
    if (description !== undefined) update.description = description || ''

    if (status !== undefined) {
      if (!['ACTIVE', 'SOLD_OUT'].includes(status)) {
        return res.status(400).json({ error: 'BAD_STATUS' })
      }
      update.status = status
    }

    if (req.body.categories !== undefined) {
      update.categories = normalizeCategories(req.body.categories)
    }

    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length > 0) update.images = files.map(f => `/uploads/${f.filename}`)

    const p = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 상태 토글 (ADMIN)
r.post('/:id([0-9a-fA-F]{24})/status', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body || {}
    if (!['ACTIVE', 'SOLD_OUT'].includes(status)) {
      return res.status(400).json({ error: 'BAD_STATUS' })
    }
    const p = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 삭제 (ADMIN)
r.delete('/:id([0-9a-fA-F]{24})', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const found = await Product.findById(req.params.id)
    if (!found) return res.status(404).json({ error: 'NOT_FOUND' })
    await Product.deleteOne({ _id: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

/**
 * ===========================
 *   단건 조회 (마지막)
 * ===========================
 */
r.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean()
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({
      id: String(p._id),
      name: p.name,
      price: p.price,
      images: Array.isArray(p.images) ? p.images : [],
      badge: p.badge,
      description: p.description ?? '',
      status: p.status,
      categories: Array.isArray((p as any).categories) ? (p as any).categories : [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

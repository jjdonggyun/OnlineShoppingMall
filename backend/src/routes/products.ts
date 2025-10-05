// routes/products.ts
import { Router } from 'express'
import Product from '../models/Product'
import { requireAuth, requireRole } from '../auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const r = Router()

type OverridesDTO = { isNew?: unknown; isBest?: unknown }
type MetricsDTO   = { sold30d?: unknown; view7d?: unknown }

const toBool = (v: unknown) =>
  v === true || v === 'true' || v === '1' || v === 1

const toNum = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}


// ──────────────────────────────── 업로드
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
})
const upload = multer({ storage })

// ──────────────────────────────── 유틸
function normalizeStrArray(input: any): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.flatMap(v => String(v).split(',')).map(s => s.trim()).filter(Boolean)
  }
  return String(input).split(',').map(s => s.trim()).filter(Boolean)
}
function safeJson<T = any>(v: any, fallback: T): T {
  if (v == null) return fallback
  try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return fallback }
}
function buildSwatches(p: any) {
  const vs = Array.isArray(p.variants) ? p.variants : []
  return vs.map((v: any) => ({
    color: v.color,
    colorHex: v.colorHex || null,
    image: v.coverImage || (Array.isArray(p.images) && p.images[0]) || null
  }))
}

// ──────────────────────────────── 목록(판매중)
// GET /api/products?category=..&tag=..&channel=NEW|BEST&limit=&page=&sort=
// ──────────────────────────────── 목록 (공개)
r.get('/', async (req, res) => {
  try {
    const { category, tag, channel, limit = '24', page = '1', sort } = req.query as any

    // ✅ ACTIVE 조건 제거, 대신 visible만 true
    const q: any = { visible: true }
    if (category && category !== 'ALL') q.categories = category
    if (tag) q.tags = tag

    if (channel === 'NEW') {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      q.$or = [{ 'overrides.isNew': true }, { createdAt: { $gte: since } }]
    } else if (channel === 'BEST') {
      q.$or = [{ 'overrides.isBest': true }, { 'metrics.sold30d': { $gt: 0 } }]
    }

    let cursor = Product.find(q)

    // 정렬은 그대로
    if (channel === 'BEST') cursor = cursor.sort({ 'overrides.isBest': -1, 'metrics.sold30d': -1, createdAt: -1 })
    else if (channel === 'NEW') cursor = cursor.sort({ 'overrides.isNew': -1, createdAt: -1 })
    else if (sort === 'price-asc') cursor = cursor.sort({ price: 1 })
    else if (sort === 'price-desc') cursor = cursor.sort({ price: -1 })
    else cursor = cursor.sort({ createdAt: -1 })

    const lim = Math.min(Math.max(1, Number(limit) || 24), 60)
    const p = Math.max(1, Number(page) || 1)
    const list = await cursor.skip((p - 1) * lim).limit(lim).lean()

    res.json(list.map(p => ({
      id: String(p._id),
      productNo: p.productNo || null,
      name: p.name,
      price: p.price,
      images: p.images || [],
      badge: p.badge,
      status: p.status,
      visible: p.visible,
      categories: p.categories || [],
      swatches: buildSwatches(p),
      tags: p.tags || [],
      overrides: p.overrides || {},
      metrics: p.metrics || {},
      createdAt: p.createdAt,
    })))
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})


// 공개 카테고리
r.get('/categories', async (_req, res) => {
  try {
    // 기존: { status: 'ACTIVE' }
    const cats = await Product.find({ visible: true }).distinct('categories')
    res.json(cats.filter(Boolean).sort())
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 관리자 카테고리 전체
r.get('/admin/categories/distinct', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const cats = await Product.distinct('categories')
    res.json(cats.sort())
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 품절 목록(ADMIN)
r.get('/admin/soldout/list', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const list = await Product.find({ status: 'SOLD_OUT' }).sort({ updatedAt: -1 }).lean()
    res.json(list.map(p => ({
      id: String(p._id),
      name: p.name,
      price: p.price,
      images: p.images || [],
      badge: p.badge,
      status: p.status,
      updatedAt: p.updatedAt,
      categories: p.categories || [],
      swatches: buildSwatches(p)
    })))
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ──────────────────────────────── 생성(ADMIN)
r.post('/', requireAuth, requireRole('ADMIN'), upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, badge, description, productNo } = req.body
    if (!name || !price) return res.status(400).json({ error: 'BAD_REQUEST' })

    const categories = normalizeStrArray(req.body.categories)
    const tags       = normalizeStrArray(req.body.tags)
    const overrides = safeJson<OverridesDTO>(req.body.overrides, {})
    const metrics   = safeJson<MetricsDTO>(req.body.metrics, {})
    const variants   = safeJson(req.body.variants, [])

    const files = (req.files as Express.Multer.File[]) ?? []
    const images = files.map(f => `/uploads/${f.filename}`)
    const visible = toBool(req.body.visible)

    const p = await Product.create({
      productNo: productNo || undefined,
      name,
      price: Number(price),
      images,
      badge: badge || undefined,
      description: description || '',
      status: 'ACTIVE',
      visible,
      categories,
      variants,
      // ★ 추가 필드
      tags,
  overrides: {
    isNew:  toBool(overrides.isNew),
    isBest: toBool(overrides.isBest),
  },
  metrics: {
    sold30d: toNum(metrics.sold30d),
    view7d:  toNum(metrics.view7d),
  },
    })
    res.status(201).json({ id: String(p._id) })
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ──────────────────────────────── 수정(ADMIN)
r.patch('/:id([0-9a-fA-F]{24})', requireAuth, requireRole('ADMIN'), upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, badge, description, status, productNo } = req.body
    const update: any = {}

    if (productNo !== undefined) update.productNo = productNo || undefined
    if (name !== undefined) update.name = name
    if (price !== undefined) update.price = Number(price)
    if (badge !== undefined) update.badge = badge || undefined
    if (description !== undefined) update.description = description || ''
    if (req.body.visible !== undefined) update.visible = toBool(req.body.visible)

    if (status !== undefined) {
      if (!['ACTIVE', 'SOLD_OUT'].includes(status)) return res.status(400).json({ error: 'BAD_STATUS' })
      update.status = status
    }

    if (req.body.categories !== undefined) update.categories = normalizeStrArray(req.body.categories)
    if (req.body.tags !== undefined)       update.tags       = normalizeStrArray(req.body.tags)
    if (req.body.overrides !== undefined) {
      const o = safeJson<OverridesDTO>(req.body.overrides, {})
      update.overrides = {
        isNew:  o.isNew  !== undefined ? toBool(o.isNew)   : undefined,
        isBest: o.isBest !== undefined ? toBool(o.isBest)  : undefined,
      }
    }
    if (req.body.metrics !== undefined) {
      const m = safeJson<MetricsDTO>(req.body.metrics, {})
      update.metrics = {
        sold30d: m.sold30d != null ? Number(m.sold30d) : undefined,
        view7d:  m.view7d  != null ? Number(m.view7d)  : undefined,
      }
    }
    if (req.body.variants !== undefined) update.variants = safeJson(req.body.variants, [])

    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length > 0) update.images = files.map(f => `/uploads/${f.filename}`)

    const p = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 상태 변경(ADMIN)
r.post('/:id([0-9a-fA-F]{24})/status', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body || {}
    if (!['ACTIVE', 'SOLD_OUT'].includes(status)) return res.status(400).json({ error: 'BAD_STATUS' })
    const p = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 삭제(ADMIN)
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

// 상세
r.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean()
    if (!p) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({
      id: String(p._id),
      productNo: p.productNo || null,
      name: p.name,
      price: p.price,
      images: p.images || [],
      badge: p.badge,
      description: p.description ?? '',
      status: p.status,
      categories: p.categories || [],
      variants: p.variants || [],
      swatches: buildSwatches(p),
      // 채널용 메타
      tags: p.tags || [],
      overrides: p.overrides || {},
      metrics: p.metrics || {},
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// 관리자 목록(검색/페이지네이션)
r.get('/admin', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { q = '', status, category, page = '1', limit = '20' } = req.query as any
    const pNum = Math.max(1, Number(page) || 1)
    const lim = Math.min(100, Math.max(1, Number(limit) || 20))

    const query: any = {}
    if (status && status !== 'ALL') query.status = status
    if (category && category !== 'ALL') query.categories = category

    if (q) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { name: rx },
        { badge: rx },
        { categories: rx },
        { tags: rx }
      ]
    }

    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip((pNum - 1) * lim).limit(lim).lean(),
      Product.countDocuments(query)
    ])

    res.json({
      page: pNum,
      limit: lim,
      total,
      pages: Math.ceil(total / lim),
      items: items.map(p => ({
        id: String(p._id),
        productNo: p.productNo || null,
        name: p.name,
        price: p.price,
        images: p.images || [],
        badge: p.badge,
        status: p.status,
        categories: p.categories || [],
        swatches: buildSwatches(p),
        tags: p.tags || [],
        overrides: p.overrides || {},
        metrics: p.metrics || {},
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

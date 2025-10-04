// src/routes/banners.ts
import { Router } from 'express'
import { requireAuth, requireRole } from '../auth'
import Banner from '../models/Banner'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'

const r = Router()

// 업로드 설정 (products와 동일)
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
})
const upload = multer({ storage })

// 공개: 현재 노출 가능한 배너 (디바이스 필터 추가)
r.get('/', async (req, res) => {
  const device = (String(req.query.device || 'web').toUpperCase() === 'MOBILE') ? 'MOBILE' : 'WEB'
  const now = new Date()

  // device=WEB  -> device in ['ALL','WEB']
  // device=MOBILE -> device in ['ALL','MOBILE']
  const deviceSet = device === 'MOBILE' ? ['ALL','MOBILE'] : ['ALL','WEB']

  const list = await Banner.find({
    active: true,
    device: { $in: deviceSet },
    $and: [
      { $or: [ { startsAt: null }, { startsAt: { $lte: now } } ] },
      { $or: [ { endsAt: null },   { endsAt:   { $gte: now } } ] },
    ]
  }).sort({ order: 1, createdAt: -1 }).lean()

  res.json(list.map(b => ({
    id: String(b._id),
    title: b.title,
    // 모바일이면 imageMobile 우선, 없으면 image
    image: (device === 'MOBILE' && b.imageMobile) ? b.imageMobile : b.image,
    link: b.link,
  })))
})

// 관리자: 목록(모든 상태) - device, imageMobile 포함
r.get('/admin/list', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const list = await Banner.find().sort({ order: 1, createdAt: -1 }).lean()
  res.json(list.map(b => ({
    id: String(b._id),
    title: b.title,
    image: b.image,
    imageMobile: b.imageMobile,
    link: b.link,
    active: b.active,
    order: b.order,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    device: b.device,
    createdAt: b.createdAt,
  })))
})
// ★ 단건 조회 추가
r.get('/admin/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'INVALID_ID' })
  }
  const b = await Banner.findById(id).lean()
  if (!b) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json({
    id: String(b._id),
    title: b.title,
    image: b.image,
    imageMobile: b.imageMobile,
    link: b.link,
    active: b.active,
    order: b.order,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    device: b.device,
  })
})

// 생성
r.post(
  '/admin',
  requireAuth, requireRole('ADMIN'),
  // image, imageMobile 두 필드 지원
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageMobile', maxCount: 1 }]),
  async (req: any, res) => {
    const { title, link, active, order, startsAt, endsAt, device } = req.body
    const f = req.files || {}
    const img = f.image?.[0]
    if (!img) return res.status(400).json({ error: 'NO_IMAGE' })

    const b = await Banner.create({
      title: title || undefined,
      image: `/uploads/${img.filename}`,
      imageMobile: f.imageMobile?.[0] ? `/uploads/${f.imageMobile[0].filename}` : undefined,
      link:  link  || undefined,
      active: active === 'false' ? false : true,
      order: order ? Number(order) : 1000,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt:   endsAt   ? new Date(endsAt)   : null,
      device: ['ALL','WEB','MOBILE'].includes((device||'').toUpperCase()) ? (device as any).toUpperCase() : 'ALL',
    })
    res.status(201).json({ id: String(b._id) })
  }
)

// 수정
r.patch(
  '/admin/:id',
  requireAuth, requireRole('ADMIN'),
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageMobile', maxCount: 1 }]),
  async (req: any, res) => {
    const { title, link, active, order, startsAt, endsAt, device } = req.body
    const f = req.files || {}
    const patch: any = {}
    if (title !== undefined) patch.title = title || undefined
    if (link  !== undefined) patch.link  = link  || undefined
    if (active !== undefined) patch.active = active === 'false' ? false : true
    if (order !== undefined) patch.order = Number(order)
    if (startsAt !== undefined) patch.startsAt = startsAt ? new Date(startsAt) : null
    if (endsAt   !== undefined) patch.endsAt   = endsAt   ? new Date(endsAt)   : null
    if (device  !== undefined) {
      const d = String(device).toUpperCase()
      if (['ALL','WEB','MOBILE'].includes(d)) patch.device = d
    }
    if (f.image?.[0])       patch.image       = `/uploads/${f.image[0].filename}`
    if (f.imageMobile?.[0]) patch.imageMobile = `/uploads/${f.imageMobile[0].filename}`

    const b = await Banner.findByIdAndUpdate(req.params.id, patch, { new: true })
    if (!b) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  }
)

// 삭제
r.delete('/admin/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const b = await Banner.findById(req.params.id)
  if (!b) return res.status(404).json({ error: 'NOT_FOUND' })
  await Banner.deleteOne({ _id: b._id })
  res.json({ ok: true })
})

// 정렬 변경(드래그&드롭 저장 시)
r.post('/admin/reorder', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const items: Array<{ id: string; order: number }> = req.body?.items || []
  const ops = items.map(it => ({
    updateOne: { filter: { _id: it.id }, update: { $set: { order: it.order } } }
  }))
  if (ops.length) await Banner.bulkWrite(ops)
  res.json({ ok: true })
})

export default r

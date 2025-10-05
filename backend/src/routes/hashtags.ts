import { Router } from 'express'
import Hashtag from '../models/Hashtag'
import { requireAuth, requireRole } from '../auth'

const r = Router()

const TYPES = ['MENU','CATEGORY','TAG','CHANNEL'] as const
type Type = typeof TYPES[number]

function parseType(q: any): Type | undefined {
  const t = String(q ?? '').toUpperCase()
  return (TYPES as readonly string[]).includes(t) ? (t as Type) : undefined
}

// 공개: 활성 해시태그(메뉴/칩/채널). 선택적으로 type 필터
// GET /api/hashtags?type=MENU|CATEGORY|TAG|CHANNEL
r.get('/', async (req, res) => {
  try {
    const t = parseType(req.query.type)
    const cond: any = { active: true }
    if (t) cond.type = t

    const list = await Hashtag.find(cond).sort({ order: 1, createdAt: 1 }).lean()
    res.json(list.map(h => ({
      id: String(h._id),
      label: h.label,
      emoji: h.emoji || null,
      type: h.type,
      value: h.value,
      order: h.order,
    })))
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ADMIN: 전체 조회(+type 필터)
// GET /api/hashtags/admin?type=MENU|CATEGORY|TAG|CHANNEL
r.get('/admin', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const t = parseType(req.query.type)
    const cond: any = {}
    if (t) cond.type = t

    const list = await Hashtag.find(cond).sort({ order: 1, createdAt: 1 }).lean()
    res.json(list.map(h => ({
      id: String(h._id),
      label: h.label,
      emoji: h.emoji || null,
      type: h.type,
      value: h.value,
      active: !!h.active,
      order: h.order,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    })))
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ADMIN: 생성
r.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { label, emoji, type, value, active = true, order = 0 } = req.body || {}
    if (!label || !type || !value) return res.status(400).json({ error: 'BAD_REQUEST' })
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'BAD_TYPE' })

    const doc = await Hashtag.create({ label, emoji, type, value, active: !!active, order: Number(order) || 0 })
    res.status(201).json({ id: String(doc._id) })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ADMIN: 수정
r.patch('/:id([0-9a-fA-F]{24})', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { label, emoji, type, value, active, order } = req.body || {}
    const update: any = {}
    if (label !== undefined) update.label = label
    if (emoji !== undefined) update.emoji = emoji
    if (type !== undefined) {
      if (!TYPES.includes(type)) return res.status(400).json({ error: 'BAD_TYPE' })
      update.type = type
    }
    if (value !== undefined) update.value = value
    if (active !== undefined) update.active = !!active
    if (order !== undefined) update.order = Number(order) || 0

    const doc = await Hashtag.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!doc) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ADMIN: 삭제
r.delete('/:id([0-9a-fA-F]{24})', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const found = await Hashtag.findById(req.params.id)
    if (!found) return res.status(404).json({ error: 'NOT_FOUND' })
    await Hashtag.deleteOne({ _id: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

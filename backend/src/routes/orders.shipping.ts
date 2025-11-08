// routes/orders.shipping.ts
import { Router } from 'express'
import Order from '../models/Order'
import { requireAuth, requireAdmin } from '../auth'

const r = Router()

// PATCH /api/orders/:id/shipping  { courierCode, courierName?, trackingNumber }
r.patch('/:id/shipping', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { courierCode, courierName, trackingNumber } = req.body || {}
    if (!courierCode || !trackingNumber) return res.status(400).json({ error: 'BAD_REQUEST' })

    const o = await Order.findById(req.params.id)
    if (!o) return res.status(404).json({ error: 'NOT_FOUND' })

    // 확장 스키마를 쓰는 경우:
    if ((o as any).shipping) {
      (o as any).shipping.courierCode = courierCode
      ;(o as any).shipping.courierName = courierName || null
      ;(o as any).shipping.trackingNumber = trackingNumber
      ;(o as any).shipping.status = 'SHIPPING'
      ;(o as any).shipping.shippedAt = new Date()
    } else {
      // 기존 단일 status만 있는 스키마인 경우:
      o.status = 'SHIPPING'
      // 필요하면 주문 doc에 메모 필드 추가해 저장해도 됨
      ;(o as any).tracking = { courierCode, courierName: courierName || null, trackingNumber }
    }

    await o.save()
    return res.json({ ok: true })
  } catch (e) {
    console.error('[orders shipping]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

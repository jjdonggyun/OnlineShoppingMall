// routes/orders.tracking.mock.ts
import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth'
import Order from '../models/Order'
import { refreshTrackingOnce } from '../services/tracking'

const r = Router()

/**
 * (관리자) 테스트용 MOCK 운송장 세팅
 * POST /api/orders/:id/mock/shipping
 * body: { trackingNumber?: string }
 * - courierCode='MOCK' 으로 설정하고 READY 로 세팅
 */
r.post('/:id/mock/shipping', requireAuth, requireAdmin as any, async (req: any, res) => {
  try {
    const o: any = await Order.findById(req.params.id)
    if (!o) return res.status(404).json({ error: 'NOT_FOUND' })

    const trackingNumber = String(req.body?.trackingNumber || Math.floor(100000000 + Math.random() * 900000000))

    // shipping 필드 없으면 생성
    if (!o.shipping) o.shipping = {}
    o.shipping.courierCode = 'MOCK'
    o.shipping.courierName = '모의택배(MOCK)'
    o.shipping.trackingNumber = trackingNumber
    o.shipping.status = 'READY'
    o.shipping.shippedAt = null
    o.shipping.deliveredAt = null
    o.shipping.lastCheckpoint = '출고 준비 (MOCK)'

    o.status = 'PENDING' // 레거시 상태는 READY일 때 PENDING/PAID 중 하나인데, 여기선 일단 PENDING 유지

    await o.save()
    return res.json({ ok: true, id: String(o._id), trackingNumber })
  } catch (e) {
    console.error('[mock/shipping]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

/**
 * (관리자) 상태 전이 1회 트리거
 * POST /api/orders/:id/mock/refresh
 * body: { forceDelivered?: boolean }
 * - courierCode='MOCK' 인 주문만 동작
 * - READY -> SHIPPING (첫 호출)
 * - SHIPPING -> DELIVERED (2분 경과 or forceDelivered=true)
 */
r.post('/:id/mock/refresh', requireAuth, requireAdmin as any, async (req: any, res) => {
  try {
    const { forceDelivered } = req.body || {}
    await refreshTrackingOnce(req.params.id, { forceDelivered: !!forceDelivered })
    const o = await Order.findById(req.params.id).lean()
    if (!o) return res.status(404).json({ error: 'NOT_FOUND' })
    return res.json({
      id: String(o._id),
      status: o.status,
      shipping: o.shipping || null,
    })
  } catch (e) {
    console.error('[mock/refresh]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

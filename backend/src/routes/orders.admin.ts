import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth'
import Order from '../models/Order'

const r = Router()

// ======================== 관리자: 주문 목록 ========================
// GET /api/orders/admin?status=ALL|PENDING|PAID|SHIPPING|DELIVERED|CANCELLED&q=&page=1&limit=20&from=YYYY-MM-DD&to=YYYY-MM-DD
r.get('/admin', requireAuth, requireAdmin as any, async (req: any, res) => {
  try {
    const {
      status = 'ALL',
      q = '',
      page = '1',
      limit = '20',
      from,
      to,
    } = req.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1)
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const cond: any = {}
    if (status && status !== 'ALL') cond.status = status

    // 기간 필터
    if (from || to) {
      cond.createdAt = {}
      if (from) cond.createdAt.$gte = new Date(`${from}T00:00:00.000Z`)
      if (to) cond.createdAt.$lte = new Date(`${to}T23:59:59.999Z`)
    }

    // 검색(q): 주문ID/사용자 필드(userId, email, name, phone)
    const or: any[] = []
    if (q) {
      // 주문ID
      or.push({ _id: q })
      // user.* 텍스트 매칭 (populate 후 필터 대신 aggregate가 정확하지만, 간단 매칭으로 구현)
      // 여기서는 나중에 프론트에서 user 정보 문자열화로 필터하는 대신, 우선 전체 조회 후 후처리도 가능
    }
    const query = Object.keys(cond).length ? { $and: [cond] } : {}

    const [items, total] = await Promise.all([
      Order.find(or.length ? { $and: [query, { $or: or }] } : query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'email userId name phone role')
        .populate('items.product', 'name images price')
        .lean(),
      Order.countDocuments(or.length ? { $and: [query, { $or: or }] } : query),
    ])

    return res.json({
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      items: items.map((o: any) => ({
        id: String(o._id),
        status: o.status,
        totalPrice: o.totalPrice,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        user: o.user
          ? {
              id: String(o.user._id),
              email: o.user.email,
              userId: o.user.userId,
              name: o.user.name,
              phone: o.user.phone,
              role: o.user.role,
            }
          : null,
        items: (o.items || []).map((it: any) => ({
          productId: String(it.product?._id || it.product),
          name: it.product?.name || '(삭제된 상품)',
          image: it.product?.images?.[0] || null,
          price: it.price,
          qty: it.qty,
          option: it.option,
        })),
        // ⬇️ 배송 정보 포함
        shipping: o.shipping
          ? {
              courierCode: o.shipping.courierCode ?? null,
              courierName: o.shipping.courierName ?? null,
              trackingNumber: o.shipping.trackingNumber ?? null,
              status: o.shipping.status ?? null,
              shippedAt: o.shipping.shippedAt ?? null,
              deliveredAt: o.shipping.deliveredAt ?? null,
              lastCheckpoint: o.shipping.lastCheckpoint ?? null,
            }
          : undefined,
      })),
    })
  } catch (e) {
    console.error('[admin orders list]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ======================== 관리자: 주문 상세 ========================
// GET /api/orders/admin/:id
r.get('/admin/:id', requireAuth, requireAdmin as any, async (req, res) => {
  try {
    const o: any = await Order.findById(req.params.id)
      .populate('user', 'email userId name phone role')
      .populate('items.product', 'name images price')
      .lean()
    if (!o) return res.status(404).json({ error: 'NOT_FOUND' })

    return res.json({
      id: String(o._id),
      status: o.status,
      totalPrice: o.totalPrice,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      user: o.user
        ? {
            id: String(o.user._id),
            email: o.user.email,
            userId: o.user.userId,
            name: o.user.name,
            phone: o.user.phone,
            role: o.user.role,
          }
        : null,
      items: (o.items || []).map((it: any) => ({
        productId: String(it.product?._id || it.product),
        name: it.product?.name || '(삭제된 상품)',
        image: it.product?.images?.[0] || null,
        price: it.price,
        qty: it.qty,
        option: it.option,
      })),
      // ⬇️ 배송 정보 포함(핵심!)
      shipping: o.shipping
        ? {
            courierCode: o.shipping.courierCode ?? null,
            courierName: o.shipping.courierName ?? null,
            trackingNumber: o.shipping.trackingNumber ?? null,
            status: o.shipping.status ?? null,
            shippedAt: o.shipping.shippedAt ?? null,
            deliveredAt: o.shipping.deliveredAt ?? null,
            lastCheckpoint: o.shipping.lastCheckpoint ?? null,
          }
        : undefined,
    })
  } catch (e) {
    console.error('[admin order detail]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

// ======================== 관리자: 주문 상태 변경 ========================
// PATCH /api/orders/:id/status  { status: 'PENDING'|'PAID'|'SHIPPING'|'DELIVERED'|'CANCELLED' }
r.patch('/:id/status', requireAuth, requireAdmin as any, async (req: any, res) => {
  try {
    const { status } = req.body || {}
    const allowed = ['PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'BAD_REQUEST' })

    const o: any = await Order.findById(req.params.id)
    if (!o) return res.status(404).json({ error: 'NOT_FOUND' })

    o.status = status

    // 확장 스키마를 쓰는 경우 shipping.status 보정
    if (o.shipping) {
      if (status === 'SHIPPING') o.shipping.status = 'SHIPPING'
      if (status === 'DELIVERED') {
        o.shipping.status = 'DELIVERED'
        o.shipping.deliveredAt = o.shipping.deliveredAt || new Date()
      }
      if (status === 'PENDING' || status === 'PAID') {
        // 배송 준비 상태로 간주
        o.shipping.status = o.shipping.status || 'READY'
      }
      if (status === 'CANCELLED') {
        // 특별 처리 없음(정책에 따라 초기화 가능)
      }
    }

    await o.save()
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin order status]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

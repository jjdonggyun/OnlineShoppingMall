// routes/payments.ts
import { Router } from 'express'
import Order from '../models/Order'
import { requireAuth } from '../auth'
import fetch from 'node-fetch' // node18↑면 global fetch 가능

const r = Router()

// 클라가 결제 성공 콜백에서 서버로 전달: { orderId, orderKey, amount }
r.post('/confirm', requireAuth, async (req: any, res) => {
  try {
    const { orderId, orderKey, amount } = req.body || {}
    if (!orderId || !orderKey || !amount) return res.status(400).json({ error: 'BAD_REQUEST' })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' })
    if (order.user.toString() !== req.user.uid) return res.status(403).json({ error: 'FORBIDDEN' })

    // 금액 검증
    if (Number(amount) !== Number(order.totalPrice)) {
      return res.status(400).json({ error: 'AMOUNT_MISMATCH' })
    }

    // === 예시: 토스 결제 인증 ===
    // const secretKey = process.env.TOSS_SECRET_KEY!
    // const r2 = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64'),
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ paymentKey: orderKey, orderId, amount }),
    // })
    // const result = await r2.json()
    // if (!r2.ok) return res.status(400).json({ error: 'PG_CONFIRM_FAIL', detail: result })

    // 여기서는 데모로 성공 처리:
    const result = { approvedAt: new Date().toISOString(), receipt: { url: '' }, mid: 'DEMO', mId: 'DEMO', transactionKey: 'DEMO_TX' }

    // 주문 업데이트
    order.payment.status = 'PAID'
    order.payment.orderKey = orderKey
    order.payment.provider = 'TOSS'
    order.payment.paidAt = new Date(result.approvedAt)
    order.payment.pgTransactionId = result.transactionKey
    order.payment.receiptUrl = result.receipt?.url || null as any
    await order.save()

    return res.json({ ok: true })
  } catch (e) {
    console.error('[payments/confirm]', e)
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default r

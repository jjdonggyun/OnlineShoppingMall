// routes/payments.webhook.ts
import { Router } from 'express'
import Order from '../models/Order'

const r = Router()

// PG가 서버로 푸시해주는 훅 (토스/포트원 등마다 바디/검증 방식 다름)
r.post('/webhook', async (req, res) => {
  try {
    const event = req.body
    // 서명 검증(필수): 예) HMAC 헤더/시크릿으로 검증
    // if (!verifySignature(req)) return res.status(401).end()

    const orderId = event?.orderId // PG가 내려주는 우리쪽 주문ID(사전에 세팅)
    if (!orderId) return res.status(200).end() // 무시

    const order = await Order.findById(orderId)
    if (!order) return res.status(200).end()     // 없는 주문이면 무시

    // 이벤트 타입에 따라 상태 전환
    if (event.type === 'PAYMENT_APPROVED') {
      order.payment.status = 'PAID'
      order.payment.paidAt = new Date(event.approvedAt)
      order.payment.pgTransactionId = event.transactionKey
      order.payment.receiptUrl = event.receipt?.url || null
      await order.save()
    } else if (event.type === 'PAYMENT_CANCELLED') {
      order.payment.status = 'CANCELLED'
      await order.save()
    }
    return res.status(200).end()
  } catch (e) {
    console.error('[payments/webhook]', e)
    return res.status(200).end() // Webhook은 200만 반환
  }
})

export default r

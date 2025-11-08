// services/tracking.ts
import Order from '../models/Order'

/**
 * MOCK 규칙
 * - courierCode === 'MOCK' 인 주문만 이 파일의 로직이 동작
 * - 상태 전이는 refreshTrackingOnce() 호출 시 자동 전이 규칙 적용
 *   READY    -> SHIPPING (첫 호출 시, shippedAt = now)
 *   SHIPPING -> DELIVERED (shippedAt 으로부터 2분 경과 or FORCE=true)
 */

export async function refreshTrackingOnce(orderId: string, opts?: { forceDelivered?: boolean }) {
  const o: any = await Order.findById(orderId)
  if (!o) return

  // shipping 필드가 없거나, 다른 택배사면 무시
  if (!o.shipping || o.shipping.courierCode !== 'MOCK') return

  const now = new Date()

  // 1) READY -> SHIPPING
  if (o.shipping.status === 'READY') {
    o.shipping.status = 'SHIPPING'
    o.shipping.shippedAt = now
    o.shipping.lastCheckpoint = '집하 완료 (MOCK)'
    o.status = 'SHIPPING' // 레거시 필드도 동기화
    await o.save()
    return
  }

  // 2) SHIPPING -> DELIVERED
  if (o.shipping.status === 'SHIPPING') {
    const shippedAt = o.shipping.shippedAt ? new Date(o.shipping.shippedAt) : now
    const elapsedMs = now.getTime() - shippedAt.getTime()
    const twoMinutes = 2 * 60 * 1000

    if (opts?.forceDelivered || elapsedMs >= twoMinutes) {
      o.shipping.status = 'DELIVERED'
      o.shipping.deliveredAt = now
      o.shipping.lastCheckpoint = '배송 완료 (MOCK)'
      o.status = 'DELIVERED' // 레거시 필드도 동기화
      await o.save()
      return
    }
  }
}

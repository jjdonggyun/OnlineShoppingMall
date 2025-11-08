// jobs/tracking.cron.ts  (서버 시작 시 주기 등록)
import cron from 'node-cron'
import Order from '../models/Order'
import { refreshTrackingOnce } from '../services/tracking'

// 10분마다 배송중인 주문 조회
export function initTrackingCron() {
  cron.schedule('*/10 * * * *', async () => {
    const list = await Order.find({ 'shipping.status': 'SHIPPING' }).select('_id').lean()
    for (const o of list) {
      refreshTrackingOnce(String(o._id)).catch(() => {})
    }
  })
}

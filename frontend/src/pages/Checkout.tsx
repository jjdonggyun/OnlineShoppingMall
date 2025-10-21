import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Nav from '../components/Nav'

export default function CheckoutPage() {
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { orderId?: string; totalPrice?: number } }
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    // 실제 결제 연동은 나중에, 지금은 “결제 완료 처리” 시뮬레이션
    await new Promise(r => setTimeout(r, 1200))
    alert('결제가 완료되었습니다!')
    nav('/mypage/orders')
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10">
        <h1 className="text-2xl font-bold mb-4">결제하기</h1>
        <div className="border rounded-lg p-6 bg-gray-50">
          <p>주문번호: {state?.orderId ?? 'N/A'}</p>
          <p>결제금액: {(state?.totalPrice ?? 0).toLocaleString()}원</p>
        </div>
        <button
          className="mt-6 px-6 py-3 rounded-xl bg-black text-white disabled:opacity-50"
          disabled={loading}
          onClick={handlePay}
        >
          {loading ? '결제 중…' : '결제하기'}
        </button>
      </div>
    </div>
  )
}

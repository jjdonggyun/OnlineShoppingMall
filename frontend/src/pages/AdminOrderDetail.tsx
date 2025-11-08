import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import type { AdminOrder } from '../types/order'

function useAdminOrder(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['admin','orders','detail', id],
    queryFn: async () => {
      const r = await fetch(`/api/orders/admin/${id}`, { credentials: 'include' })
      if (!r.ok) throw new Error('LOAD_FAIL')
      return r.json() as Promise<AdminOrder & { updatedAt: string }>
    }
  })
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth(s => ({ user: s.user }))

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') nav('/', { replace: true })
  }, [user, nav])

  const { data: o, isLoading } = useAdminOrder(id)

  async function updateStatus(next: AdminOrder['status']) {
    if (!id) return
    const ok = confirm(`주문 상태를 '${next}'로 변경할까요?`)
    if (!ok) return
    const r = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: next })
    })
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ['admin','orders'] })
      qc.invalidateQueries({ queryKey: ['admin','orders','detail', id] })
    } else {
      alert('상태 변경 실패')
    }
  }

  // ───────── 운송장 등록 상태/뮤테이션 ─────────
  const [courierCode, setCourierCode] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const mShipping = useMutation({
    mutationFn: async (payload: {courierCode: string; courierName?: string; trackingNumber: string}) => {
      if (!id) throw new Error('NO_ID')
      const r = await fetch(`/api/orders/${id}/shipping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err?.error || 'SAVE_FAIL')
      }
      return r.json()
    },
    onSuccess: () => {
      alert('운송장 등록 완료')
      qc.invalidateQueries({ queryKey: ['admin','orders'] })
      qc.invalidateQueries({ queryKey: ['admin','orders','detail', id] })
      setCourierCode('')
      setCourierName('')
      setTrackingNumber('')
    },
    onError: (e: any) => {
      alert(`저장 실패: ${e?.message || 'ERROR'}`)
    }
  })

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="mx-auto w-full max-w-[900px] px-3 sm:px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">주문 상세</h1>
          <Link to="/admin/orders" className="px-3 py-2 rounded border">목록</Link>
        </div>

        {isLoading && <div className="text-gray-400 mt-8">불러오는 중…</div>}
        {!isLoading && !o && <div className="text-gray-400 mt-8">주문을 찾을 수 없습니다.</div>}

        {o && (
          <div className="mt-6 space-y-6">
            {/* 상단 요약 */}
            <div className="border rounded-xl p-4">
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <div className="text-sm text-gray-500">주문ID</div>
                  <div className="font-mono">{o.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">주문일</div>
                  <div>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">결제</div>
                  <div>{o.paymentMethod}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">금액</div>
                  <div className="font-semibold">{o.totalPrice.toLocaleString()}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">상태</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-gray-900 text-white">{o.status}</span>
                    <select
                      className="px-2 py-1 rounded border"
                      defaultValue={o.status}
                      onChange={(e)=> updateStatus(e.target.value as AdminOrder['status'])}
                    >
                      {['PENDING','PAID','SHIPPING','DELIVERED','CANCELLED'].map(s =>
                        <option key={s} value={s}>{s}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 주문자 정보 */}
            <div className="border rounded-xl p-4">
              <div className="font-semibold mb-3">주문자</div>
              {o.user ? (
                <div className="text-sm">
                  <div>{o.user.name} <span className="text-gray-500">({o.user.userId})</span></div>
                  <div className="text-gray-600">{o.user.email} / {o.user.phone}</div>
                </div>
              ) : <div className="text-gray-400">(탈퇴/미상)</div>}
            </div>

            {/* 주문 상품 */}
            <div className="border rounded-xl p-4">
              <div className="font-semibold mb-3">주문 상품</div>
              <div className="divide-y">
                {o.items.map((it, i) => (
                  <div key={i} className="py-3 flex gap-3 items-center">
                    <img src={it.image || 'https://via.placeholder.com/80x80?text=No'} className="w-16 h-16 rounded object-cover" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-xs text-gray-500">
                        수량 {it.qty} · {it.price.toLocaleString()}원
                        {it.option && (
                          <>
                            {' '}· 옵션: {[
                              it.option.color && `색상 ${it.option.color}`,
                              it.option.size && `사이즈 ${it.option.size}`,
                              it.option.sku && `SKU ${it.option.sku}`
                            ].filter(Boolean).join(', ')}
                          </>
                        )}
                      </div>
                      <Link to={`/products/${it.productId}`} className="text-xs text-blue-600 hover:underline">상품 보기</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 배송 정보/운송장 등록 */}
            <div className="border rounded-xl p-4">
              <div className="font-semibold mb-3">배송 정보</div>

              {/* 저장된 배송 정보 요약 (확장 스키마를 사용하는 경우) */}
              {o.shipping?.trackingNumber && (
                <div className="mb-4 text-sm bg-gray-50 rounded-lg p-3">
                  <div>택배사: {o.shipping.courierName || o.shipping.courierCode || '-'}</div>
                  <div>운송장: {o.shipping.trackingNumber}</div>
                  <div>상태: {o.shipping.status || (o.status === 'DELIVERED' ? 'DELIVERED' : o.status === 'SHIPPING' ? 'SHIPPING' : 'READY')}</div>
                </div>
              )}

              {/* 운송장 입력 폼 */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="택배사 코드 (예: CJ)"
                  value={courierCode}
                  onChange={(e)=> setCourierCode(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="택배사 이름 (선택)"
                  value={courierName}
                  onChange={(e)=> setCourierName(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="운송장번호"
                  value={trackingNumber}
                  onChange={(e)=> setTrackingNumber(e.target.value)}
                />
                <button
                  className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
                  disabled={!courierCode || !trackingNumber || mShipping.isPending}
                  onClick={() => mShipping.mutate({ courierCode, courierName: courierName || undefined, trackingNumber })}
                >
                  {mShipping.isPending ? '저장 중…' : '운송장 등록'}
                </button>
              </div>

              {/* 유의사항 */}
              <p className="text-xs text-gray-500 mt-2">
                운송장 등록 시 상태가 자동으로 <b>배송 중</b>으로 바뀝니다. (배송 조회 연동 전이라면 수동으로 &lt;배송 완료&gt; 처리해 주세요)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

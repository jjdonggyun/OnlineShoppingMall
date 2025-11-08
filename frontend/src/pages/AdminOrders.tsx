import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import type { AdminOrderListResp, AdminOrder } from '../types/order'

function useAdminOrders(sp: URLSearchParams) {
  const q = sp.toString()
  return useQuery({
    queryKey: ['admin','orders', q],
    queryFn: async () => {
      const r = await fetch(`/api/orders/admin?${q}`, { credentials: 'include' })
      if (!r.ok) throw new Error('LOAD_FAIL')
      return r.json() as Promise<AdminOrderListResp>
    }
  })
}

export default function AdminOrders() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth(s => ({ user: s.user }))
  const [sp, setSp] = useSearchParams()

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') nav('/', { replace: true })
  }, [user, nav])

  // 기본 파라미터
  useEffect(() => {
    const init = new URLSearchParams(sp)
    if (!init.get('page')) init.set('page','1')
    if (!init.get('limit')) init.set('limit','20')
    if (!init.get('status')) init.set('status','ALL')
    if (init.toString() !== sp.toString()) setSp(init, { replace: true })
  }, []) // eslint-disable-line

  const { data, isLoading } = useAdminOrders(sp)

  const q = sp.get('q') ?? ''
  const status = sp.get('status') ?? 'ALL'
  const page = Number(sp.get('page') ?? '1')
  const limit = Number(sp.get('limit') ?? '20')
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(sp)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.set('page','1')
    setSp(next)
  }

  async function updateStatus(id: string, next: AdminOrder['status']) {
    const ok = confirm(`주문 상태를 '${next}'로 변경할까요?`)
    if (!ok) return
    const r = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: next })
    })
    if (r.ok) qc.invalidateQueries({ queryKey: ['admin','orders'] })
    else alert('상태 변경 실패')
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />

      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-8">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">주문 관리</h1>
            <p className="text-sm text-gray-500 mt-1">모든 주문을 조회/필터/상태변경</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/products" className="px-4 py-2 rounded-lg border text-sm">상품 관리</Link>
            <Link to="/admin/banners" className="px-4 py-2 rounded-lg border text-sm">배너 관리</Link>
          </div>
        </div>

        {/* 필터 */}
        <div className="mt-6 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-6">
          <input
            className="col-span-2 sm:col-span-2 border rounded px-3 py-2"
            placeholder="주문ID/이메일/아이디/이름/전화"
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value
                setParam('q', v)
              }
            }}
          />
          <select
            className="border rounded px-3 py-2"
            value={status}
            onChange={(e)=> setParam('status', e.target.value)}
          >
            <option value="ALL">전체 상태</option>
            <option value="PENDING">결제 대기</option>
            <option value="PAID">결제 완료</option>
            <option value="SHIPPING">배송 중</option>
            <option value="DELIVERED">배송 완료</option>
          </select>

          <input
            type="date"
            className="border rounded px-3 py-2"
            value={from}
            onChange={(e)=> setParam('from', e.target.value)}
            title="From (YYYY-MM-DD)"
          />
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={to}
            onChange={(e)=> setParam('to', e.target.value)}
            title="To (YYYY-MM-DD)"
          />
          <select
            className="border rounded px-3 py-2"
            value={String(limit)}
            onChange={(e)=> setParam('limit', e.target.value)}
          >
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}개씩</option>)}
          </select>
        </div>

        {/* 테이블 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">주문ID</th>
                <th className="py-2 pr-3">사용자</th>
                <th className="py-2 pr-3">상품(요약)</th>
                <th className="py-2 pr-3">결제수단</th>
                <th className="py-2 pr-3">금액</th>
                <th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3">주문일</th>
                <th className="py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">불러오는 중…</td></tr>
              )}

              {data?.items.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-3">
                    <Link to={`/admin/orders/${o.id}`} className="font-mono hover:underline">{o.id}</Link>
                  </td>
                  <td className="py-2 pr-3">
                    {o.user ? (
                      <div className="min-w-0">
                        <div className="font-medium">{o.user.name} <span className="text-gray-500">({o.user.userId})</span></div>
                        <div className="text-xs text-gray-500">{o.user.email} / {o.user.phone}</div>
                      </div>
                    ) : <span className="text-gray-400">(탈퇴/미상)</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      {o.items.slice(0,2).map((it, i) => (
                        <img key={i} src={it.image || 'https://via.placeholder.com/40x40?text=No'} className="w-8 h-8 rounded object-cover" />
                      ))}
                      <span className="text-xs text-gray-500">
                        {o.items.length > 2 ? `+${o.items.length - 2}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">{o.paymentMethod}</td>
                  <td className="py-2 pr-3">{o.totalPrice.toLocaleString()}원</td>
                  <td className="py-2 pr-3">
                    <span className={[
                      'px-2 py-1 rounded text-xs',
                      o.status === 'PENDING'   ? 'bg-yellow-100 text-yellow-800' :
                      o.status === 'PAID'      ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'SHIPPING'  ? 'bg-blue-100 text-blue-800' :
                      o.status === 'DELIVERED' ? 'bg-gray-900 text-white' :
                      'bg-red-100 text-red-700'
                    ].join(' ')}>{o.status}</span>
                  </td>
                  <td className="py-2 pr-3">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/orders/${o.id}`} className="px-2 py-1 rounded border hover:bg-gray-100">상세</Link>
                      {/* 상태 빠르게 바꾸는 셀렉트 */}
                      <select
                        className="px-2 py-1 rounded border"
                        defaultValue={o.status}
                        onChange={(e)=> updateStatus(o.id, e.target.value as AdminOrder['status'])}
                        title="상태 변경"
                      >
                        {['PENDING','PAID','SHIPPING','DELIVERED','CANCELLED'].map(s =>
                          <option key={s} value={s}>{s}</option>
                        )}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}

              {(!isLoading && (data?.items.length ?? 0) === 0) && (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              disabled={page <= 1}
              onClick={()=> setParam('page', String(page - 1))}
            >이전</button>
            <div className="text-sm text-gray-600">{page} / {data.pages} (총 {data.total}건)</div>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              disabled={page >= data.pages}
              onClick={()=> setParam('page', String(page + 1))}
            >다음</button>
          </div>
        )}
      </div>
    </div>
  )
}

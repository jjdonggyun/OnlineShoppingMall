import { useParams, Link, useNavigate } from 'react-router-dom' // URL 파라미터/페이지 이동 (Mendix: Page parameter + Show page)
import { useQuery, useQueryClient } from '@tanstack/react-query' // 서버 호출 + 캐시 (Mendix: Call REST + 클라이언트 캐시 개념)
import type { Product } from '../components/ProductCard'
import { useEffect, useState } from 'react'
import { useAuth } from '../stores/auth'                         // 전역 인증 상태 (Mendix: Session/Account 컨텍스트)
import { useCart } from '../stores/useCart'
import { useCartSmart } from '../stores/useCartSmart'


export default function ProductDetail() {
  const { id } = useParams()                                     // URL의 /products/:id → id 추출 (Mendix: 페이지 파라미터)
  const nav = useNavigate()                                      // 페이지 이동 핸들러
  const qc = useQueryClient()                                     // react-query 캐시 제어 (invalidate 등)
  const { user } = useAuth(s => ({ user: s.user }))              // 로그인 유저 (권한 확인용)

  // 상품 상세 로드 (Mendix: Call REST → Data view datasource)
  const { data } = useQuery({
    queryKey: ['product', id],                                   // 캐시 키: 상품 개별
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`)               // REST: GET /api/products/:id
      if (!r.ok) throw new Error('NOT_FOUND')                    // 404/에러 처리
      return r.json() as Promise<Product & { description?: string }>
    }
  })

  // 이미지 슬라이더 상태 (Mendix: Timer + Nanoflow 조합으로 구현 가능)
  const [idx, setIdx] = useState(0)                              // 현재 표시 이미지 인덱스
  const imgs = data?.images?.length ? data.images                // 이미지가 있으면 사용
    : ['https://via.placeholder.com/600x800?text=No+Image']      // 없으면 플레이스홀더
  const { addItem } = useCart()
  const cart = useCartSmart()
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<null | { type: 'ok' | 'err'; msg: string }>(null)

  async function handleAdd() {
    if (!data) return;
    try {
      setAdding(true)
      await cart.addAsync(data.id, 1)
      setToast({ type: 'ok', msg: '장바구니에 담았습니다' })
    } catch {
      setToast({ type: 'err', msg: '담기에 실패했습니다' })
    } finally {
      setAdding(false)
      setTimeout(() => setToast(null), 1400)
    }
  }


  useEffect(() => { setIdx(0) }, [id])                           // 다른 상품 id로 바뀌면 인덱스 초기화

  if (!data) return <div className="container-max py-20">로딩중...</div> // 로딩 중 표시 (Mendix: Progress)

  // 슬라이드 제어 (원형 순환)
  function prev() { setIdx(i => (i - 1 + imgs.length) % imgs.length) }
  function next() { setIdx(i => (i + 1) % imgs.length) }
  function go(n: number) { setIdx(n) }

  // 삭제 액션 (관리자 전용) — Mendix: 마이크로플로우(Call REST DELETE) + 성공 후 목록 재조회 + 페이지 이동
  async function onDelete() {
    if (!id) return
    if (!confirm('정말 삭제하시겠습니까?')) return              // 브라우저 확인 대화상자
    const r = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include'                                     // 쿠키 기반 인증 포함
    })
    if (!r.ok) {
      alert('삭제 실패')
      return
    }
    // 목록 캐시 갱신 후 홈으로 이동 (Mendix: 데이터 재로드 + 페이지 네비게이션)
    qc.invalidateQueries({ queryKey: ['products'] })             // 캐시 무효화 → 목록 페이지가 최신화
    nav('/')
  }

  return (
    <div>
      {/* 상단 바: 뒤로가기 + 관리자 삭제 버튼 */}
      <div className="container-max py-4">
        <Link to="/" className="text-sm text-gray-600">← 목록으로</Link>
      </div>

      {/* 관리자만 '삭제' 노출 — Mendix의 Conditional visibility */}
      {user?.role === 'ADMIN' && (
        <button
          onClick={onDelete}
          className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
        >
          삭제
        </button>
      )}
      {/* // pages/ProductDetail.tsx (관리자 버튼 추가) */}
      {/* 관리자만 보이는 편집/상태 토글 */}
      {user?.role === 'ADMIN' && (
        <div className="mt-4 flex gap-2">
          <Link
            to={`/admin/products/${data.id}/edit`}
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm"
          >
            편집
          </Link>
          <button
            onClick={async () => {
              const to = data.status === 'SOLD_OUT' ? 'ACTIVE' : 'SOLD_OUT'
              const ok = confirm(
                to === 'SOLD_OUT' ? '이 상품을 품절로 표시할까요?' : '이 상품을 판매 재개할까요?'
              )
              if (!ok) return
              const r = await fetch(`/api/products/${data.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: to })
              })
              if (r.ok) {
                // 상세 재조회
                await qc.invalidateQueries({ queryKey: ['product', id] })
                setToast({ type: 'ok', msg: to === 'SOLD_OUT' ? '품절 처리됨' : '판매 재개됨' })
                setTimeout(() => setToast(null), 1000)
              } else {
                setToast({ type: 'err', msg: '처리에 실패했습니다' })
                setTimeout(() => setToast(null), 1200)
              }
            }}
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm"
          >
            {data.status === 'SOLD_OUT' ? '판매 재개' : '품절 처리'}
          </button>
        </div>
      )}


      {/* 본문: 좌측 이미지 갤러리 / 우측 상품 정보 */}
      <div className="container-max grid md:grid-cols-2 gap-8 py-6">
        {/* 이미지 영역 */}
        <div className="relative">
          <img
            src={imgs[idx]}
            alt={`${data.name}-${idx + 1}`}
            className="w-full rounded-xl object-cover"
          />

          {/* 여러 장일 때만 좌우 화살표 + 썸네일 표시 */}
          {imgs.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">
                &lt;
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">
                &gt;
              </button>
            </>
          )}

          {/* 썸네일 리스트 (현재 선택 이미지는 ring 표시) */}
          {imgs.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`border rounded-lg overflow-hidden ${i === idx ? 'ring-2 ring-black' : ''}`}>
                  <img src={src} alt={`thumb-${i + 1}`} className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-xl font-semibold mt-2">
            {data.price.toLocaleString()}원
          </div>

          <h1 className="text-2xl font-bold flex items-center gap-2">
            {data.name}
            {data.status === 'SOLD_OUT' && (
              <span className="text-xs px-2 py-1 rounded bg-gray-900 text-white">품절</span>
            )}
          </h1>

          {/* 상세 설명이 있을 때만 표시 (Conditional visibility) */}
          {data.description && (
            <p className="mt-4 text-gray-700 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* 장바구니: 여기서는 프론트 버튼만 존재(실제 기능은 별도 구현 필요) */}
          <button
            className={`mt-6 px-6 py-3 rounded-xl text-white ${adding ? 'bg-gray-600' : 'bg-black'}`}
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? '담는 중…' : '장바구니'}
          </button>

          {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow
                         ${toast.type === 'ok' ? 'bg-black text-white' : 'bg-red-600 text-white'}`}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// components/SelectProductModal.tsx
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type P = { id:string; name:string; price:number; images:string[]; status:'ACTIVE'|'SOLD_OUT' }

export default function SelectProductModal({
  name,
  onClose,
}: {
  name: 'RECOMMENDED'|'SEASONAL'|'BEST'
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const qc = useQueryClient()

  // 바디 스크롤 락
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ESC 닫기 (데스크톱)
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-search', q, onlyActive],
    queryFn: async () => {
      // 간단: 공개 상품 목록을 받아 프론트 필터
      const r = await fetch('/api/products')
      const list = (await r.json()) as P[]
      const filtered = list.filter(p => (!onlyActive || p.status === 'ACTIVE') && p.name.toLowerCase().includes(q.toLowerCase()))
      return filtered.slice(0, 50)
    }
  })

  async function add(productId: string) {
    const r = await fetch(`/api/collections/${name}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId })
    })
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ['collection', name] })
      alert('추가되었습니다.')
      onClose()
    } else {
      const e = await r.json().catch(()=>({}))
      alert(e?.error || '추가 실패')
    }
  }

  // 모바일(<=768px): 바텀시트 풀높이, 데스크톱: 가운데 다이얼로그
  return (
    <div
      className="fixed inset-0 z-[1000]"
      aria-modal
      role="dialog"
      onClick={(e) => {
        // 바깥(반투명 배경) 클릭 시 닫기
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* 컨테이너: 모바일 바텀시트 / 데스크톱 센터 */}
      <div
        className="
          absolute left-1/2 -translate-x-1/2
          w-full max-w-2xl
          md:top-1/2 md:-translate-y-1/2
          md:rounded-2xl
          md:h-auto md:max-h-[80vh]

          /* 모바일: 하단 시트 */
          bottom-0 md:bottom-auto
          md:relative
        "
        style={{ pointerEvents: 'none' }} // 내부만 클릭 가능하게 래퍼
      >
        <div
          className="
            bg-white shadow-xl
            md:rounded-2xl
            pointer-events-auto

            /* 모바일 전용 레이아웃 */
            md:pb-0
            rounded-t-2xl
            h-[100dvh] md:h-auto
            md:max-h-[80vh]
            flex flex-col
            pt-3
            [padding-bottom:env(safe-area-inset-bottom)]
          "
        >
          {/* 모바일 그립바 */}
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-300 md:hidden" />

          {/* 헤더 */}
          <div className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between border-b">
            <h4 className="text-base md:text-lg font-semibold">
              {name}에 상품 추가
            </h4>
            <button
              onClick={onClose}
              className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
            >
              닫기
            </button>
          </div>

          {/* 검색 바 */}
          <div className="px-4 md:px-5 py-3 flex items-center gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm md:text-base"
              placeholder="상품명 검색"
              value={q}
              onChange={e => setQ(e.target.value)}
              inputMode="search"
            />
            <label className="text-xs md:text-sm flex items-center gap-1 select-none">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={e => setOnlyActive(e.target.checked)}
              />
              판매중만
            </label>
          </div>

          {/* 리스트 (스크롤 영역) */}
          <div className="flex-1 overflow-y-auto px-2 md:px-3 pb-3">
            {isLoading && (
              <div className="p-3 text-sm text-gray-500">불러오는 중…</div>
            )}
            {data?.map(p => (
              <div
                key={p.id}
                className="p-2 md:p-3 flex items-center gap-3 md:gap-4 border-b last:border-b-0"
              >
                <img
                  src={p.images[0] ?? 'https://via.placeholder.com/80'}
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded"
                  alt={p.name}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm md:text-base font-medium truncate">{p.name}</div>
                  <div className="text-xs md:text-sm text-gray-500">
                    {p.price.toLocaleString()}원 {p.status === 'SOLD_OUT' && '· 품절'}
                  </div>
                </div>
                <button
                  className="text-xs md:text-sm px-3 py-1.5 rounded border hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => add(p.id)}
                >
                  추가
                </button>
              </div>
            ))}
            {!isLoading && (!data || data.length === 0) && (
              <div className="p-3 text-sm text-gray-500">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

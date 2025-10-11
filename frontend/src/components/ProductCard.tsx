import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../types/product'
import WishButton from './WishButton'
import { useCartSmart } from '../stores/useCartSmart'
import OptionSheet from './OptionSheet'

/** 간단 태그 사전 훅 */
function useTagDict() {
  const [dict, setDict] = useState<Record<string, { label: string; emoji?: string | null }>>({})
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/hashtags?type=TAG')
        if (!r.ok) return
        const list = (await r.json()) as Array<{ value: string; label: string; emoji?: string | null }>
        if (!alive) return
        const d: Record<string, { label: string; emoji?: string | null }> = {}
        for (const h of list) d[h.value] = { label: h.label, emoji: h.emoji ?? null }
        setDict(d)
      } catch {}
    })()
    return () => { alive = false }
  }, [])
  return dict
}

function dotStyle(hex?: string | null) {
  const bg = hex || '#999999'
  return { backgroundColor: bg }
}

function TagBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-white">
      {text}
    </span>
  )
}

export default function ProductCard({
  p,
  onRemove,
}: {
  p: Product
  onRemove?: (id: string) => void
}) {
  const imgs = p.images?.length ? p.images : ['https://via.placeholder.com/600x800?text=No+Image']
  const [preview, setPreview] = useState<string>(imgs[0])

  // 자동 슬라이드
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (imgs.length <= 1) return
    timer.current = window.setInterval(() => setIdx(i => (i + 1) % imgs.length), 2000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [imgs.length])
  useEffect(() => { setPreview(imgs[idx]) }, [idx])

  // 스와치
  const swatches = useMemo(() => {
    if (p.swatches && p.swatches.length) return p.swatches
    const v = p.variants ?? []
    return v.map(vv => ({ color: vv.color, colorHex: vv.colorHex, image: vv.coverImage || imgs[0] }))
  }, [p.swatches, p.variants, imgs])

  // 태그
  const tagDict = useTagDict()
  const viewTags = useMemo(
    () => (p.tags ?? []).map(v => tagDict[v]?.label ?? v),
    [p.tags, tagDict]
  )

  const cart = useCartSmart()

  // ⚠️ 목록 API가 variants를 안 줄 수 있으므로 보수적으로 "옵션이 있을 가능성"을 추정
  const optionGuess =
    (p as any).optionRequired === true ||
    (p as any).variantCount > 0 ||
    (p.variants?.length ?? 0) > 0 ||
    (p.swatches?.length ?? 0) > 0     // swatch가 있으면 보통 옵션형

  const [sheetOpen, setSheetOpen] = useState(false)

  function stopNav(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  // 서버 OPTION_REQUIRED(400) 대응: 실패 시 시트 오픈
  async function safeAddSimple(productId: string) {
    try {
      await cart.addAsync(productId, 1)
    } catch (e: any) {
      // 서버에서 400 { error: 'OPTION_REQUIRED' }로 내려오도록 백엔드 방어가 되어 있으면 여기서 잡힘
      // 게스트 장바구니는 로컬이라 실패가 안 날 수 있으므로, 게스트라면 처음부터 시트 열도록 위에서 optionGuess로 유도.
      setSheetOpen(true)
    }
  }

  return (
    <div className="relative group">
      {/* 본문만 링크 */}
      <Link to={`/products/${p.id}`} className="block">
        {/* 이미지 */}
        <div className="relative w-full aspect-[368/462]">
          <img
            src={preview}
            alt={p.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* 찜 버튼 */}
          <div className="absolute top-2 right-2" onMouseDown={stopNav} onClick={stopNav}>
            <WishButton productId={p.id} className="bg-white/90 hover:bg-white shadow-sm" />
          </div>

          {/* 장바구니 버튼 */}
          <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition">
            <button
              className="w-full rounded-lg bg-black/85 text-white py-2 text-sm hover:bg-black"
              onMouseDown={stopNav}
              onClick={(e) => {
                stopNav(e)
                if (optionGuess) {
                  setSheetOpen(true)
                } else {
                  void safeAddSimple(p.id)
                }
              }}
            >
              장바구니 담기
            </button>
          </div>
        </div>

        {/* 텍스트 */}
        <div className="mt-2 text-sm">
          <div className="font-medium">{p.name}</div>
          <div className="text-gray-600">{p.price.toLocaleString()}원</div>

          {(viewTags.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1 min-h-[1.25rem]">
              {viewTags.slice(0, 4).map((t, i) => <TagBadge key={i} text={`#${t}`} />)}
              {viewTags.length > 4 && (
                <span className="text-[11px] text-gray-500">+{viewTags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* 스와치 (링크 전파 차단) */}
      {swatches.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          {swatches.slice(0, 8).map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-4 h-4 rounded-full border border-black/10"
              title={s.color}
              style={dotStyle(s.colorHex)}
              onMouseEnter={() => s.image && setPreview(s.image)}
              onFocus={() => s.image && setPreview(s.image)}
              onMouseDown={stopNav}
              onClick={(e) => { stopNav(e); if (s.image) setPreview(s.image) }}
            />
          ))}
          {swatches.length > 8 && (
            <span className="text-[11px] text-gray-500">+{swatches.length - 8}</span>
          )}
        </div>
      )}

      {/* 관리자 제거 버튼 */}
      {onRemove && (
        <button
          onMouseDown={stopNav}
          onClick={(e) => { stopNav(e); onRemove(p.id) }}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/90 border shadow-sm 
                     hover:bg-red-100 text-red-600 hidden group-hover:block"
        >
          제거
        </button>
      )}

      {/* 옵션 시트: product가 불완전할 수 있으니 id도 넘김 */}
      {(optionGuess) && (
        <OptionSheet
          product={p}                 // variants가 없으면 내부에서 productId로 재로딩
          productId={p.id}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onConfirm={async (opt) => {
            setSheetOpen(false)
            await cart.addAsync(p.id, 1, opt)
          }}
        />
      )}
    </div>
  )
}

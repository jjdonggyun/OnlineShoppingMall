// src/components/ProductCard.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../types/product'

/** 간단 태그 사전 훅: /api/hashtags?type=TAG → { [value]: {label, emoji} } */
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
      } catch {
        // noop
      }
    })()
    return () => {
      alive = false
    }
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

  // 슬라이드(선택) — 색상 클릭 시 미리보기 고정
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (imgs.length <= 1) return
    timer.current = window.setInterval(() => setIdx(i => (i + 1) % imgs.length), 2000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [imgs.length])
  useEffect(() => { setPreview(imgs[idx]) }, [idx]) // 기본 동작

  // 백엔드에서 swatches가 오면 우선 사용
  const swatches = useMemo(() => {
    if (p.swatches && p.swatches.length) return p.swatches
    const v = p.variants ?? []
    return v.map(vv => ({ color: vv.color, colorHex: vv.colorHex, image: vv.coverImage || imgs[0] }))
  }, [p.swatches, p.variants, imgs])

  // 태그 표시용: value → label 매핑
  const tagDict = useTagDict()
  const viewTags = useMemo(
    () => (p.tags ?? []).map(v => tagDict[v]?.label ?? v),
    [p.tags, tagDict]
  )

  return (
    <div className="relative group">
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
        </div>

        {/* 텍스트 */}
        <div className="mt-2 text-sm">
          <div className="font-medium">
            {p.name}
          </div>
          <div className="text-gray-600">{p.price.toLocaleString()}원</div>

          {/* ✅ 배지 대신 TAG 뱃지들 */}
          {(viewTags.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1 min-h-[1.25rem]">
              {viewTags.slice(0, 4).map((t, i) => (
                <TagBadge key={i} text={`#${t}`} />
              ))}
              {viewTags.length > 4 && (
                <span className="text-[11px] text-gray-500">+{viewTags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* 색상 스와치 */}
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
              onClick={(e) => { e.preventDefault(); if (s.image) setPreview(s.image) }}
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
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(p.id) }}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/90 border shadow-sm 
                     hover:bg-red-100 text-red-600 hidden group-hover:block"
        >
          제거
        </button>
      )}
    </div>
  )
}

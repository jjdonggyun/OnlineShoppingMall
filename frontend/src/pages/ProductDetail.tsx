// src/pages/ProductDetail.tsx
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import { useCartSmart } from '../stores/useCartSmart'
import type { Product, Variant, VariantSize } from '../types/product'
import WishButton from '../components/WishButton'

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
        /* noop */
      }
    })()
    return () => { alive = false }
  }, [])
  return dict
}

function TagBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-white">
      {text}
    </span>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth(s => ({ user: s.user }))
  const cart = useCartSmart()

  // ✅ 훅: 항상 같은 순서/개수로 호출되도록 최상단에 배치
  const { data } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`)
      if (!r.ok) throw new Error('NOT_FOUND')
      return r.json() as Promise<Product>
    },
    enabled: !!id
  })

  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [id])

  // 옵션 선택 상태
  const [vIdx, setVIdx] = useState<number | null>(null)
  const [sizeName, setSizeName] = useState<string | null>(null)
  useEffect(() => { setSizeName(null) }, [vIdx]) // 색상 바꾸면 사이즈 초기화

  // 데이터 파생
  const variants: Variant[] = useMemo(
    () => data?.variants ?? [],
    [data?.variants]
  )

  const swatches = useMemo(
    () =>
      (data?.swatches && data.swatches.length > 0)
        ? data.swatches
        : variants.map(v => ({
            color: v.color,
            colorHex: v.colorHex,
            image: v.coverImage || data?.images?.[0]
          })),
    [data?.swatches, data?.images, variants]
  )

  const currentVariant: Variant | null = useMemo(
    () => (vIdx != null ? variants[vIdx] ?? null : null),
    [vIdx, variants]
  )
  const currentSizes: VariantSize[] = currentVariant?.sizes ?? []

  // 태그 매핑(훅은 여기서 호출)
  const tagDict = useTagDict()
  const viewTags = useMemo(
    () => (data?.tags ?? []).map(v => tagDict[v]?.label ?? v),
    [data?.tags, tagDict]
  )

  // 장바구니/토스트 상태
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<null | { type: 'ok' | 'err'; msg: string }>(null)

  // ❗ UI 분기를 위해 early return을 쓰되, 이미 모든 훅을 위에서 호출했으므로 안전
  if (!data) {
    return (
      <div className="min-h-screen bg-white text-[#222]">
        <Nav />
        <div className="container-max py-20">로딩중...</div>
      </div>
    )
  }

  const d = data
  const imgs = d.images?.length ? d.images : ['https://via.placeholder.com/600x800?text=No+Image']

  function prev() { setIdx(i => (i - 1 + imgs.length) % imgs.length) }
  function next() { setIdx(i => (i + 1) % imgs.length) }
  function go(n: number) { setIdx(n) }

  // 담기 가능 조건
  const canAdd =
    (variants.length === 0) || (vIdx != null && !!sizeName)

  // 색상 총 재고(해당 색상 사이즈 합)
  const variantTotalStock = (v: Variant) =>
    (v.sizes ?? []).reduce((sum, s) => sum + (typeof s.stock === 'number' ? s.stock : 0), 0)

  async function handleAdd() {
    if (!canAdd) {
      setToast({ type: 'err', msg: '색상과 사이즈를 선택해 주세요' })
      setTimeout(() => setToast(null), 1200)
      return
    }
    try {
      setAdding(true)
      const opt = variants.length
        ? {
            variantIndex: vIdx!, // 선택된 변형 인덱스
            color: currentVariant?.color,
            colorHex: currentVariant?.colorHex,
            size: sizeName!,
            sku: currentVariant?.sizes?.find(s => s.name === sizeName!)?.sku,
          }
        : undefined
      await (cart as any).addAsync(d.id, 1, opt)
      setToast({ type: 'ok', msg: '장바구니에 담았습니다' })
    } catch {
      setToast({ type: 'err', msg: '담기에 실패했습니다' })
    } finally {
      setAdding(false)
      setTimeout(() => setToast(null), 1400)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />

      <div className="container-max py-4">
        <Link to="/" className="text-sm text-gray-600">← 목록으로</Link>
      </div>

      <div className="container-max grid md:grid-cols-2 gap-8 py-6">
        {/* 이미지 갤러리 */}
        <div className="relative">
          <img src={imgs[idx]} alt={`${d.name}-${idx + 1}`} className="w-full rounded-xl object-cover" />
          {imgs.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">&lt;</button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">&gt;</button>
            </>
          )}
          {imgs.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {imgs.map((src: string, i: number) => (
                <button key={i} onClick={() => go(i)} className={`border rounded-lg overflow-hidden ${i === idx ? 'ring-2 ring-black' : ''}`}>
                  <img src={src} alt={`thumb-${i + 1}`} className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 + 옵션 선택 */}
        <div>
          <div className="text-xs text-gray-500">{d.productNo}</div>
          <h1 className="text-2xl font-bold">{d.name}</h1>

          {/* TAG 뱃지들 */}
          {(viewTags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {viewTags.map((t, i) => <TagBadge key={i} text={`#${t}`} />)}
            </div>
          )}

          {(d.categories?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {d.categories!.map((c: string, i: number) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full border">{c}</span>
              ))}
            </div>
          )}

          <div className="text-xl font-semibold mt-2">{d.price.toLocaleString()}원</div>

          {d.status === 'SOLD_OUT' && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-900 text-white">품절</span>
            </div>
          )}

          {d.description && (
            <p className="mt-4 text-gray-700 leading-relaxed">{d.description}</p>
          )}

          {/* 색상 선택 */}
          {variants.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="text-sm text-gray-700">
                색상 {vIdx != null && currentVariant?.color ? `: ${currentVariant.color}` : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => {
                  const total = variantTotalStock(v)
                  const disabled = total <= 0
                  const active = vIdx === i
                  return (
                    <button
                      key={`${v.color}-${i}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setVIdx(i)
                        // 해당 색상 대표 이미지로 이동
                        const repImg = (variants?.[i]?.coverImage) || swatches?.[i]?.image
                        if (repImg) {
                          const idxInImgs = imgs.findIndex(x => x === repImg)
                          go(idxInImgs >= 0 ? idxInImgs : 0)
                        }
                      }}
                      className={[
                        'px-3 py-2 rounded-lg border text-sm',
                        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50',
                        active ? 'ring-2 ring-black' : ''
                      ].join(' ')}
                      title={disabled ? '재고 없음' : undefined}
                    >
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 align-[-1px] mr-2"
                        style={{ backgroundColor: v.colorHex || '#999999' }}
                        aria-hidden
                      />
                      {v.color}{typeof total === 'number' ? ` (${total})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 사이즈 선택 */}
          {variants.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="text-sm text-gray-700">사이즈</div>
              {vIdx == null && (
                <div className="text-xs text-rose-600">먼저 색상을 선택해주세요.</div>
              )}
              <div className="flex flex-wrap gap-2">
                {(currentSizes ?? []).map((s: VariantSize) => {
                  const disabled = !s.stock || s.stock <= 0
                  const active = sizeName === s.name
                  return (
                    <button
                      key={s.name}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSizeName(s.name)}
                      className={[
                        'px-3 py-2 rounded-lg border text-sm',
                        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50',
                        active ? 'ring-2 ring-black' : ''
                      ].join(' ')}
                      title={disabled ? '재고 없음' : undefined}
                    >
                      {s.name}{typeof s.stock === 'number' ? ` (${s.stock})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}


          <WishButton productId={d.id} className="border w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-50" />
          {/* 담기 버튼 */}
          <button
            className={`mt-6 px-6 py-3 rounded-xl text-white ${adding ? 'bg-gray-600' : 'bg-black'} ${(!canAdd ? 'opacity-60' : '')}`}
            onClick={handleAdd}
            disabled={adding || !canAdd}
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

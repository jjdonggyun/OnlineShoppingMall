import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import { useCartSmart } from '../stores/useCartSmart'
import type { Product, Variant, VariantSize } from '../types/product'
import WishButton from '../components/WishButton'

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
  const { user } = useAuth(s => ({ user: s.user }))
  const cart = useCartSmart()

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
  const [vIdx, setVIdx] = useState<number | null>(null)
  const [sizeName, setSizeName] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<null | { type: 'ok' | 'err'; msg: string }>(null)

  useEffect(() => { setIdx(0) }, [id])
  useEffect(() => { setSizeName(null) }, [vIdx])

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
  const variants: Variant[] = d.variants ?? []
  const currentVariant = vIdx != null ? variants[vIdx] ?? null : null
  const currentSizes = currentVariant?.sizes ?? []
  const canAdd = (variants.length === 0) || (vIdx != null && !!sizeName)

  const variantTotalStock = (v: Variant) =>
    (v.sizes ?? []).reduce((sum, s) => sum + (typeof s.stock === 'number' ? s.stock : 0), 0)

  // ✅ 통합 핸들러 — 안내 포함
  async function handleAction(buyNow = false) {
    if (!canAdd) {
      // 색상 또는 사이즈가 선택되지 않은 경우
      setToast({
        type: 'err',
        msg: variants.length > 0
          ? '색상과 사이즈를 모두 선택해주세요.'
          : '상품 옵션을 선택해주세요.',
      })
      setTimeout(() => setToast(null), 1800)
      return
    }

    try {
      setAdding(true)
      const opt = variants.length
        ? {
            variantIndex: vIdx!,
            color: currentVariant?.color,
            colorHex: currentVariant?.colorHex,
            size: sizeName!,
            sku: currentVariant?.sizes?.find(s => s.name === sizeName!)?.sku,
          }
        : undefined

      await (cart as any).addAsync(d.id, 1, opt)

      if (buyNow) {
        setToast({ type: 'ok', msg: '주문을 준비 중입니다...' })
        if (!user) {
          nav('/login')
          return
        }
        const r = await fetch('/api/orders/single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId: d.id, qty: 1, option: opt }),
        })
        const j = await r.json()
        if (!r.ok) {
          setToast({ type: 'err', msg: '주문 생성 실패: ' + (j.error || r.status) })
          setTimeout(() => setToast(null), 1500)
          return
        }
        nav('/checkout', { state: { orderId: j.id, totalPrice: j.totalPrice } })
      } else {
        setToast({ type: 'ok', msg: '장바구니에 담았습니다.' })
        setTimeout(() => setToast(null), 1400)
      }
    } catch {
      setToast({ type: 'err', msg: '처리 중 오류가 발생했습니다.' })
      setTimeout(() => setToast(null), 1500)
    } finally {
      setAdding(false)
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
              <button onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">&lt;</button>
              <button onClick={() => setIdx((i) => (i + 1) % imgs.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">&gt;</button>
            </>
          )}
        </div>

        {/* 상품 정보 */}
        <div>
          <h1 className="text-2xl font-bold">{d.name}</h1>
          <div className="text-xl font-semibold mt-2">{d.price.toLocaleString()}원</div>

          {d.status === 'SOLD_OUT' && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-900 text-white">품절</span>
            </div>
          )}

          {d.description && <p className="mt-4 text-gray-700">{d.description}</p>}

          {/* 색상 */}
          {variants.length > 0 && (
            <div className="mt-6">
              <div className="text-sm mb-2">색상</div>
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
                      onClick={() => setVIdx(i)}
                      className={[
                        'px-3 py-2 rounded-lg border text-sm',
                        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50',
                        active ? 'ring-2 ring-black' : ''
                      ].join(' ')}
                    >
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 mr-2"
                        style={{ backgroundColor: v.colorHex || '#999999' }}
                      />
                      {v.color}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 사이즈 */}
          {variants.length > 0 && (
            <div className="mt-6">
              <div className="text-sm mb-2">사이즈</div>
              {vIdx == null && (
                <div className="text-xs text-rose-600 mb-1">먼저 색상을 선택해주세요.</div>
              )}
              <div className="flex flex-wrap gap-2">
                {(currentSizes ?? []).map((s) => {
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
                    >
                      {s.name}{typeof s.stock === 'number' ? ` (${s.stock})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-3 mt-6">
            <button
              className={`flex-1 px-6 py-3 rounded-xl text-white ${adding ? 'bg-gray-600' : 'bg-black'}`}
              onClick={() => handleAction(false)}
              disabled={adding}
            >
              {adding ? '담는 중…' : '장바구니'}
            </button>
            <button
              className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white"
              onClick={() => handleAction(true)}
              disabled={adding}
            >
              바로구매
            </button>
            <WishButton productId={d.id} className="border w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-50" />
          </div>

          {/* 토스트 안내 */}
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

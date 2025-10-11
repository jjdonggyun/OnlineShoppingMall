import { useEffect, useMemo, useState } from 'react'
import type { Product, Variant, VariantSize } from '../types/product'
import type { CartOption } from '../stores/useCartSmart'

type OptProduct = Product | null

export default function OptionSheet({
  product,
  productId,              // ✅ 추가: id만으로도 호출 가능
  open,
  onClose,
  onConfirm,
}: {
  product?: Product
  productId?: string
  open: boolean
  onClose: () => void
  onConfirm: (opt: CartOption) => void
}) {
  const [prod, setProd] = useState<OptProduct>(product ?? null)
  const [loading, setLoading] = useState(false)

  // 시트 열릴 때 variants 없으면 상세를 로드
  useEffect(() => {
    let alive = true
    async function load() {
      if (!open) return
      // 이미 제품이 있고 variants가 있으면 패스
      if (product && Array.isArray(product.variants) && product.variants.length > 0) {
        setProd(product)
        return
      }
      // product가 없고 id만 있는 경우 or variants가 비어있는 경우 → 상세 fetch
      const id = product?.id ?? productId
      if (!id) return
      try {
        setLoading(true)
        const r = await fetch(`/api/products/${id}`)
        if (!r.ok) throw new Error('NOT_FOUND')
        const full = (await r.json()) as Product
        if (!alive) return
        setProd(full)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [open, product, productId])

  const variants: Variant[] = useMemo(() => prod?.variants ?? [], [prod])
  const [vIdx, setVIdx] = useState<number | null>(null)
  const [sizeName, setSizeName] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setVIdx(null); setSizeName(null) }
  }, [open])

  const current = vIdx != null ? variants[vIdx] ?? null : null
  const sizes: VariantSize[] = current?.sizes ?? []

  const canConfirm = variants.length === 0 || (vIdx != null && !!sizeName)

  function variantTotalStock(v: Variant) {
    return (v.sizes ?? []).reduce((s, it) => s + (typeof it.stock === 'number' ? it.stock : 0), 0)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="닫기" />
      {/* sheet */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[540px] rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">옵션 선택</h3>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>닫기</button>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="py-8 text-center text-sm text-gray-600">옵션 정보를 불러오는 중…</div>
        )}

        {/* 색상 선택 */}
        {!loading && variants.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-800 mb-2">색상</div>
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
                    onClick={() => { setVIdx(i); setSizeName(null) }}
                    className={[
                      'px-3 py-2 rounded-lg border text-sm',
                      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50',
                      active ? 'ring-2 ring-black' : ''
                    ].join(' ')}
                    title={disabled ? '재고 없음' : undefined}
                  >
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 align-[-1px] mr-2"
                      style={{ backgroundColor: v.colorHex || '#999' }}
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
        {!loading && variants.length > 0 && (
          <div className="mt-5">
            <div className="text-sm font-medium text-gray-800 mb-2">사이즈</div>
            {vIdx == null && <div className="text-xs text-rose-600 mb-2">먼저 색상을 선택해주세요.</div>}
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => {
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

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose}>취소</button>
          <button
            className={`px-4 py-2 rounded-lg text-white ${canConfirm ? 'bg-black' : 'bg-gray-500 cursor-not-allowed'}`}
            disabled={!canConfirm}
            onClick={() => {
              const vs = variants.length
              const opt: CartOption | undefined =
                vs
                  ? {
                      variantIndex: vIdx!,
                      color: current?.color,
                      colorHex: current?.colorHex,
                      size: sizeName!,
                      sku: current?.sizes?.find(s => s.name === sizeName!)?.sku,
                    }
                  : undefined
              if (vs && !opt) return
              onConfirm(opt!)
            }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  )
}

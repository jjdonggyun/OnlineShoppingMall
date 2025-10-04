// pages/Cart.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../stores/useCart'
import { useCartSmart } from '../stores/useCartSmart'
import Nav from '../components/Nav'

// 서버/게스트 공통으로 제품 상세(옵션 표시용) 캐시
type PMap = Record<
  string,
  {
    name: string
    price: number
    images: string[]
    variants?: Array<{
      color: string
      colorHex?: string
      coverImage?: string
      sizes: Array<{ name: string; stock?: number; sku?: string }>
    }>
    swatches?: Array<{ color: string; colorHex?: string; image?: string }>
  }
>

// 장바구니 행(표시용)
type Row = {
  productId: string
  name: string
  price: number
  images: string[]
  qty: number
  line: number
  // 선택 옵션(있을 수 있음)
  variantIndex?: number | null
  color?: string
  colorHex?: string
  size?: string
  sku?: string
}

export default function CartPage() {
  const smart = useCartSmart()
  const server = useCart() // 서버 데이터(shape) 재사용
  const [products, setProducts] = useState<PMap>({})

  // 게스트일 때, productId 목록으로 벌크 조회(옵션 표시 위해 variants/swatches까지 로드)
  useEffect(() => {
    if (smart.isLoggedIn) return
    const ids = smart.guestItems.map(it => it.productId)
    if (ids.length === 0) { setProducts({}); return }
    ; (async () => {
      const entries: [string, PMap[string]][] = []
      for (const id of ids) {
        try {
          const r = await fetch(`/api/products/${id}`)
          if (!r.ok) continue
          const p = await r.json()
          entries.push([
            id,
            {
              name: p.name,
              price: p.price,
              images: p.images || [],
              variants: p.variants || [],
              swatches: p.swatches || [],
            }
          ])
        } catch { }
      }
      setProducts(Object.fromEntries(entries))
    })()
  }, [smart.isLoggedIn, smart.guestItems])

  // 서버 유저라면, 장바구니 속 아이템에 이미 옵션 정보(color/size 등)가 들어있다고 가정
  // 게스트는 smart.guestItems 쪽의 opt를 활용(없으면 undefined)
  const rows: Row[] = useMemo(() => {
    if (smart.isLoggedIn) {
      if (server.cart.isLoading || !server.cart.data) return []
      return server.cart.data.items.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        images: it.images,
        qty: it.qty,
        line: it.line,
        variantIndex: it.variantIndex ?? null,
        color: it.color,
        colorHex: it.colorHex,
        size: it.size,
        sku: it.sku,
      }))
    } else {
      return smart.guestItems.map((it: any) => {
        const p = products[it.productId]
        const price = p?.price ?? 0
        return {
          productId: it.productId,
          name: p?.name ?? '(삭제된 상품)',
          price,
          images: p?.images ?? [],
          qty: it.qty,
          line: price * it.qty,
          variantIndex: it.variantIndex ?? null,
          color: it.color ?? null,
          colorHex: it.colorHex ?? null,
          size: it.size ?? null,
          sku: it.sku ?? null,
        }
      })
    }
  }, [smart.isLoggedIn, server.cart.isLoading, server.cart.data, smart.guestItems, products])

  useEffect(() => {
    if (!smart.isLoggedIn) {
      console.log('[guestItems]', smart.guestItems)
    } else {
      console.log('[server cart data]', server.cart.data?.items)
    }
  }, [smart.isLoggedIn, smart.guestItems, server.cart.data])

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalPrice = rows.reduce((s, r) => s + r.line, 0)

  // ===== 옵션 변경 UI 상태 =====
  // 편집 중인 productId -> { vIdx, sizeName }
  const [editing, setEditing] = useState<Record<string, { vIdx: number | null; sizeName: string | null }>>({})

  function startEdit(row: Row) {
    // 현재 선택 상태를 기본값으로
    setEditing(prev => ({
      ...prev,
      [row.productId]: {
        vIdx: typeof row.variantIndex === 'number' ? row.variantIndex : null,
        sizeName: row.size ?? null
      }
    }))
  }
  function cancelEdit(productId: string) {
    setEditing(prev => {
      const { [productId]: _, ...rest } = prev
      return rest
    })
  }

  // 색상/사이즈 변경 핸들러(편집 모드 내)
  function setEditColor(productId: string, vIdx: number) {
    setEditing(prev => ({
      ...prev,
      [productId]: { vIdx, sizeName: null } // 색상 바꾸면 사이즈 초기화
    }))
  }
  function setEditSize(productId: string, name: string) {
    setEditing(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? { vIdx: null, sizeName: null }), sizeName: name }
    }))
  }

  // 옵션 적용(서버/게스트 각각 처리; 메서드 없으면 폴백으로 remove→add)
  async function applyOption(row: Row) {
    const edit = editing[row.productId]
    if (!edit || edit.vIdx == null || !edit.sizeName) return

    // 제품 옵션 정보 얻기
    const product = products[row.productId]
    const variant = product?.variants?.[edit.vIdx]
    const sizeObj = variant?.sizes?.find(s => s.name === edit.sizeName)
    const opt = {
      variantIndex: edit.vIdx,
      color: variant?.color,
      colorHex: variant?.colorHex,
      size: edit.sizeName,
      sku: sizeObj?.sku,
    }

    try {
      if (smart.isLoggedIn) {
        // 1) useCartSmart에 메서드가 있으면 사용
        const maybeUpdate = (smart as any).updateOption
        if (typeof maybeUpdate === 'function') {
          await maybeUpdate(row.productId, opt)
        } else {
          // 2) 직접 API 폴백 (예시: PUT /api/cart/items/:productId)
          // 백엔드 라우트에 맞게 바꿔 사용하세요
          await fetch(`/api/cart/items/${row.productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ option: opt })
          })
            // 서버 스토어 refetch 필요하다면 내부에서 해주거나 수동으로 트리거
            ; (server as any).refetch?.()
        }
      } else {
        // 게스트 로컬 장바구니 갱신
        const maybeUpdateGuest = (smart as any).updateGuestOption
        if (typeof maybeUpdateGuest === 'function') {
          await maybeUpdateGuest(row.productId, opt)
        } else {
          // 폴백: 삭제 후 동일 수량으로 다시 담기
          smart.remove(row.productId)
          const maybeAdd = (smart as any).add || (smart as any).addAsync
          if (typeof maybeAdd === 'function') {
            await maybeAdd(row.productId, row.qty, opt)
          } else {
            // 최후 폴백: setQty가 옵션을 못 받는다면 정보 유실 가능(필요 시 스토어 보완)
            console.warn('No add/addAsync in useCartSmart; please provide updateGuestOption/add')
          }
        }
      }
    } finally {
      cancelEdit(row.productId)
    }
  }

  // 편집용 옵션 렌더
  function OptionEditor({ row }: { row: Row }) {
    const p = products[row.productId]
    const vList = p?.variants ?? []
    const edit = editing[row.productId] ?? { vIdx: null, sizeName: null }
    const currentSizes = (edit.vIdx != null ? vList[edit.vIdx]?.sizes : []) ?? []

    // 색상 버튼에서 “총 재고” (모든 사이즈 stock 합)
    const totalStock = (v: any) =>
      (v?.sizes ?? []).reduce((n: number, s: any) => n + (typeof s?.stock === 'number' ? s.stock : 0), 0)

    return (
      <div className="mt-2 border rounded-lg p-3 bg-gray-50">
        <div className="text-sm text-gray-700 mb-1">색상</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {vList.length === 0 && <span className="text-xs text-gray-500">옵션 없음</span>}
          {vList.map((v, i) => {
            const disabled = totalStock(v) <= 0
            const active = edit.vIdx === i
            return (
              <button
                key={`${v.color}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => setEditColor(row.productId, i)}
                className={[
                  'px-3 py-2 rounded-lg border text-sm',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white',
                  active ? 'ring-2 ring-black' : ''
                ].join(' ')}
                title={disabled ? '재고 없음' : undefined}
              >
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 align-[-1px] mr-2"
                  style={{ backgroundColor: v.colorHex || '#999999' }}
                  aria-hidden
                />
                {v.color}
              </button>
            )
          })}
        </div>

        <div className="text-sm text-gray-700 mb-1">사이즈</div>
        {edit.vIdx == null && <div className="text-xs text-rose-600 mb-2">먼저 색상을 선택해주세요.</div>}
        <div className="flex flex-wrap gap-2">
          {(currentSizes ?? []).map(s => {
            const disabled = !s.stock || s.stock <= 0
            const active = edit.sizeName === s.name
            return (
              <button
                key={s.name}
                type="button"
                disabled={disabled}
                onClick={() => setEditSize(row.productId, s.name)}
                className={[
                  'px-3 py-2 rounded-lg border text-sm',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white',
                  active ? 'ring-2 ring-black' : ''
                ].join(' ')}
                title={disabled ? '재고 없음' : undefined}
              >
                {s.name}{typeof s.stock === 'number' ? ` (${s.stock})` : ''}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="px-4 py-2 rounded-lg border hover:bg-white"
            onClick={() => cancelEdit(row.productId)}
          >
            취소
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            disabled={!(edit.vIdx != null && edit.sizeName)}
            onClick={() => applyOption(row)}
          >
            옵션 적용
          </button>
        </div>
      </div>
    )
  }

  if (smart.isLoggedIn && server.cart.isLoading) {
    return <div className="container-max py-10">불러오는 중…</div>
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10">
        <h1 className="text-2xl font-bold mb-6">장바구니</h1>

        {rows.length === 0 ? (
          <div className="text-gray-600">
            장바구니가 비었습니다. <Link to="/" className="underline">상품 보러가기</Link>
          </div>
        ) : (
          <>
            <ul className="divide-y">
              {rows.map((it) => {
                const isEditing = !!editing[it.productId]
                const p = products[it.productId] // 게스트일 때만 존재(서버는 옵션 바꾸려면 개별 fetch 필요 시 확장)
                return (
                  <li key={it.productId} className="py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={it.images?.[0] || 'https://via.placeholder.com/80x80?text=No+Image'}
                        alt=""
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-sm text-gray-600">{it.price.toLocaleString()}원</div>

                        {/* 선택된 옵션 표시 */}
                        {(it.color || it.size) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {it.color && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border">
                                <span
                                  className="inline-block w-3 h-3 rounded-full border border-black/10"
                                  style={{ backgroundColor: it.colorHex || '#999999' }}
                                />
                                {it.color}
                              </span>
                            )}
                            {it.size && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border">
                                {it.size}
                              </span>
                            )}
                            {/* 옵션 변경 버튼 (게스트는 바로, 서버는 제품 상세 미로딩 시 버튼 비활성화) */}
                            <button
                              className="ml-1 underline text-gray-700 disabled:text-gray-400"
                              disabled={!p && !smart.isLoggedIn /* 서버는 개별 제품 옵션 정보 없으면 비활성화(필요시 fetch 확장) */}
                              onClick={() => startEdit(it)}
                            >
                              옵션 변경
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="px-2 border rounded"
                          onClick={() => smart.setQty(it.productId, Math.max(1, it.qty - 1))}>-</button>
                        <span className="w-8 text-center">{it.qty}</span>
                        <button className="px-2 border rounded"
                          onClick={() => smart.setQty(it.productId, it.qty + 1)}>+</button>
                      </div>
                      <div className="w-28 text-right">{it.line.toLocaleString()}원</div>
                      <button className="ml-4 text-sm text-red-600"
                        onClick={() => smart.remove(it.productId)}>삭제</button>
                    </div>

                    {/* 옵션 편집 영역 */}
                    {isEditing && <OptionEditor row={it} />}
                  </li>
                )
              })}
            </ul>

            <div className="mt-6 flex items-center justify-between">
              {!smart.isLoggedIn && (
                <div className="text-sm text-gray-600">
                  로그인하면 장바구니가 계정에 저장돼요. <Link to="/login" className="underline">로그인</Link>
                </div>
              )}
              <div className="text-right ml-auto">
                <div>총 수량: <b>{totalQty}</b>개</div>
                <div className="text-xl font-semibold">결제금액: {totalPrice.toLocaleString()}원</div>
                <button className="mt-3 px-6 py-3 rounded-xl bg-black text-white" disabled={!smart.isLoggedIn}>
                  {smart.isLoggedIn ? '결제하기(추가 구현)' : '로그인 후 결제'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

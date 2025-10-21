import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../stores/useCart'
import { useCartSmart } from '../stores/useCartSmart'
import Nav from '../components/Nav'

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

type Row = {
  productId: string
  name: string
  price: number
  images: string[]
  qty: number
  serverLine?: number
  linePrice: number
  variantIndex?: number | null
  color?: string | null
  colorHex?: string | null
  size?: string | null
  sku?: string | null
}

export default function CartPage() {
  const smart = useCartSmart()
  const server = useCart()
  const nav = useNavigate()

  const [products, setProducts] = useState<PMap>({})
  const [editing, setEditing] = useState<Record<string, { vIdx: number | null; sizeName: string | null }>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})


  function toggleSelect(row: Row) {
    const key = lineKey(row, smart.isLoggedIn)
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function isSelected(row: Row) {
    const k = lineKey(row, smart.isLoggedIn)
    return !!selected[k]
  }


  // ──────────────────────────────── helpers
  function lineKey(row: Row, isLoggedIn: boolean) {
    return isLoggedIn && row.serverLine != null
      ? `s:${row.serverLine}`
      : `g:${row.productId}:${row.sku ?? row.size ?? row.variantIndex ?? ''}`
  }

  async function ensureProductLoaded(id: string) {
    if (products[id]) return
    try {
      const r = await fetch(`/api/products/${id}`)
      if (!r.ok) return
      const p = await r.json()
      setProducts(prev => ({
        ...prev,
        [id]: {
          name: p.name,
          price: p.price,
          images: p.images || [],
          variants: p.variants || [],
          swatches: p.swatches || [],
        }
      }))
    } catch { }
  }

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
          entries.push([id, {
            name: p.name,
            price: p.price,
            images: p.images || [],
            variants: p.variants || [],
            swatches: p.swatches || [],
          }])
        } catch { }
      }
      setProducts(Object.fromEntries(entries))
    })()
  }, [smart.isLoggedIn, smart.guestItems])

  const rows: Row[] = useMemo(() => {
    if (smart.isLoggedIn) {
      if (server.cart.isLoading || !server.cart.data) return []
      return server.cart.data.items.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        price: Number(it.price) || 0,
        images: Array.isArray(it.images) ? it.images : [],
        qty: Number(it.qty) || 0,
        serverLine: typeof it.line === 'number' ? it.line : undefined,
        linePrice: Number(it.linePrice ?? (Number(it.price) || 0) * (Number(it.qty) || 0)) || 0,
        variantIndex: it.variantIndex ?? null,
        color: it.color ?? null,
        colorHex: it.colorHex ?? null,
        size: it.size ?? null,
        sku: it.sku ?? null,
      }))
    } else {
      return smart.guestItems.map((it: any) => {
        const p = products[it.productId]
        const price = Number(p?.price ?? 0) || 0
        const qty = Number(it.qty) || 0
        return {
          productId: it.productId,
          name: p?.name ?? '(삭제된 상품)',
          price,
          images: p?.images ?? [],
          qty,
          linePrice: price * qty,
          variantIndex: it.variantIndex ?? null,
          color: it.color ?? null,
          colorHex: it.colorHex ?? null,
          size: it.size ?? null,
          sku: it.sku ?? null,
        }
      })
    }
  }, [smart.isLoggedIn, server.cart.isLoading, server.cart.data, smart.guestItems, products])

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalPrice = rows.reduce((s, r) => s + r.linePrice, 0)

  function startEdit(row: Row) {
    void ensureProductLoaded(row.productId)
    const k = lineKey(row, smart.isLoggedIn)
    setEditing(prev => ({
      ...prev,
      [k]: {
        vIdx: typeof row.variantIndex === 'number' ? row.variantIndex : null,
        sizeName: row.size ?? null
      }
    }))
  }

  function cancelEdit(rowOrKey: Row | string) {
    const k = typeof rowOrKey === 'string' ? rowOrKey : lineKey(rowOrKey, smart.isLoggedIn)
    setEditing(prev => {
      const { [k]: _, ...rest } = prev
      return rest
    })
  }

  function setEditColor(row: Row, vIdx: number) {
    const k = lineKey(row, smart.isLoggedIn)
    setEditing(prev => ({ ...prev, [k]: { vIdx, sizeName: null } }))
  }

  function setEditSize(row: Row, name: string) {
    const k = lineKey(row, smart.isLoggedIn)
    setEditing(prev => {
      const cur = prev[k] ?? { vIdx: null, sizeName: null }
      return { ...prev, [k]: { ...cur, sizeName: name } }
    })
  }

  async function changeQty(row: Row, nextQty: number) {
    const q = Math.max(1, nextQty)
    if (smart.isLoggedIn) {
      if (row.serverLine == null) return
      await (server as any).updateQtyByLine.mutateAsync({ line: row.serverLine, qty: q })
    } else {
      smart.setQty(row.productId, q)
    }
  }

  async function removeRow(row: Row) {
    if (smart.isLoggedIn) {
      if (row.serverLine == null) return
      await (server as any).removeItemByLine.mutateAsync(row.serverLine)
    } else {
      smart.remove(row.productId)
    }
  }

  async function applyOption(row: Row, editKey: string) {
    const edit = editing[editKey]
    if (!edit || edit.vIdx == null || !edit.sizeName) return

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
        if (row.serverLine == null) return
        const r = await fetch(`/api/cart/items/line/${row.serverLine}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ option: opt }),
        })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          alert(`옵션 변경 실패: ${j.error ?? r.status}`)
          return
        }
        server.cart.refetch()
        cancelEdit(editKey)
      } else {
        const updateGuest = (smart as any).updateGuestOption
        if (typeof updateGuest === 'function') await updateGuest(row.productId, opt)
        cancelEdit(editKey)
      }
    } catch (e) {
      console.error(e)
      alert('옵션 변경 중 오류가 발생했습니다.')
    }
  }

  async function handleBuySelected() {
    if (!smart.isLoggedIn) {
      alert('로그인이 필요합니다.')
      nav('/login')
      return
    }

    const selectedLines = rows
      .filter(r => isSelected(r))
      .map(r => r.serverLine!)
      .filter(n => typeof n === 'number')

    if (selectedLines.length === 0) {
      alert('구매할 상품을 선택해주세요.')
      return
    }

    const r = await fetch('/api/orders/from-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ lines: selectedLines }),
    })
    const j = await r.json()
    if (!r.ok) {
      alert('주문 생성 실패: ' + (j.error || r.status))
      return
    }
    server.clear.mutate()
    nav('/checkout', { state: { orderId: j.id, totalPrice: j.totalPrice } })
  }

  function OptionEditor({ row, editKey }: { row: Row; editKey: string }) {
    const p = products[row.productId]
    const vList = p?.variants ?? []
    const edit = editing[editKey] ?? { vIdx: null, sizeName: null }
    const currentSizes = (edit.vIdx != null ? vList[edit.vIdx]?.sizes : []) ?? []

    return (
      <div className="mt-2 border rounded-lg p-3 bg-gray-50">
        <div className="text-sm text-gray-700 mb-1">색상</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {vList.map((v, i) => {
            const disabled = (v.sizes ?? []).every(s => (s.stock ?? 0) <= 0)
            const active = edit.vIdx === i
            return (
              <button
                key={`${v.color}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => setEditColor(row, i)}
                className={[
                  'px-3 py-2 rounded-lg border text-sm',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white',
                  active ? 'ring-2 ring-black' : ''
                ].join(' ')}
              >
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 align-[-1px] mr-2"
                  style={{ backgroundColor: v.colorHex || '#999999' }}
                />
                {v.color}
              </button>
            )
          })}
        </div>

        <div className="text-sm text-gray-700 mb-1">사이즈</div>
        <div className="flex flex-wrap gap-2">
          {(currentSizes ?? []).map(s => {
            const disabled = !s.stock || s.stock <= 0
            const active = edit.sizeName === s.name
            return (
              <button
                key={s.name}
                type="button"
                disabled={disabled}
                onClick={() => setEditSize(row, s.name)}
                className={[
                  'px-3 py-2 rounded-lg border text-sm',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white',
                  active ? 'ring-2 ring-black' : ''
                ].join(' ')}
              >
                {s.name}{typeof s.stock === 'number' ? ` (${s.stock})` : ''}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded-lg border hover:bg-white" onClick={() => cancelEdit(editKey)}>취소</button>
          <button
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            disabled={!(edit.vIdx != null && edit.sizeName)}
            onClick={() => applyOption(row, editKey)}
          >
            옵션 적용
          </button>
        </div>
      </div>
    )
  }

  if (smart.isLoggedIn && server.cart.isLoading) {
    return (
      <div className="min-h-screen bg-white text-[#222]">
        <Nav />
        <div className="container-max py-10">불러오는 중…</div>
      </div>
    )
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
                const k = lineKey(it, smart.isLoggedIn)
                const isEditing = !!editing[k]
                const hasProduct = !!products[it.productId]
                return (
                  <li key={k} className="py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(it)}
                      onChange={() => toggleSelect(it)}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-4">
                      <img
                        src={it.images?.[0] || 'https://via.placeholder.com/80x80?text=No+Image'}
                        alt=""
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-sm text-gray-600">{(it.price || 0).toLocaleString()}원</div>

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
                            <button
                              className="ml-1 underline text-gray-700 disabled:text-gray-400"
                              disabled={!hasProduct && !smart.isLoggedIn}
                              onClick={() => startEdit(it)}
                            >
                              옵션 변경
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="px-2 border rounded" onClick={() => changeQty(it, Math.max(1, it.qty - 1))}>-</button>
                        <span className="w-8 text-center">{it.qty}</span>
                        <button className="px-2 border rounded" onClick={() => changeQty(it, it.qty + 1)}>+</button>
                      </div>

                      <div className="w-28 text-right">{(it.linePrice || 0).toLocaleString()}원</div>

                      <button className="ml-4 text-sm text-red-600" onClick={() => removeRow(it)}>삭제</button>
                    </div>

                    {isEditing && <OptionEditor row={it} editKey={k} />}
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
                <div className="mt-3 flex gap-3 justify-end">
                  <button
                    className="px-6 py-3 rounded-xl bg-gray-700 text-white"
                    onClick={handleBuySelected}
                    disabled={!smart.isLoggedIn || rows.length === 0}
                  >
                    선택상품 구매
                  </button>
                  <button
                    className="px-6 py-3 rounded-xl bg-black text-white"
                    disabled={!smart.isLoggedIn}
                  >
                    {smart.isLoggedIn ? '결제하기(추가 구현)' : '로그인 후 결제'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

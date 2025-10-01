// pages/Cart.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../stores/useCart'
import { useCartSmart } from '../stores/useCartSmart'

type PMap = Record<string, { name: string; price: number; images: string[] }>

export default function CartPage() {
  const smart = useCartSmart()
  const server = useCart() // 서버 데이터(shape) 재사용
  const [products, setProducts] = useState<PMap>({})

  // 게스트일 때, productId 목록으로 벌크 조회
  useEffect(() => {
    if (smart.isLoggedIn) return
    const ids = smart.guestItems.map(it => it.productId)
    if (ids.length === 0) { setProducts({}); return }
    // 간단히 N건 개별 조회(GET /api/products/:id)로 구현 (필요하면 /api/products?ids=... 로 최적화)
    ;(async () => {
      const entries: [string, PMap[string]][] = []
      for (const id of ids) {
        try {
          const r = await fetch(`/api/products/${id}`)
          if (!r.ok) continue
          const p = await r.json()
          entries.push([id, { name: p.name, price: p.price, images: p.images || [] }])
        } catch {}
      }
      setProducts(Object.fromEntries(entries))
    })()
  }, [smart.isLoggedIn, smart.guestItems])

  // 렌더용 아이템 리스트
  const rows = useMemo(() => {
    if (smart.isLoggedIn) {
      if (server.cart.isLoading || !server.cart.data) return []
      return server.cart.data.items.map(it => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        images: it.images,
        qty: it.qty,
        line: it.line
      }))
    } else {
      return smart.guestItems.map(it => {
        const p = products[it.productId]
        return {
          productId: it.productId,
          name: p?.name ?? '(삭제된 상품)',
          price: p?.price ?? 0,
          images: p?.images ?? [],
          qty: it.qty,
          line: (p?.price ?? 0) * it.qty
        }
      })
    }
  }, [smart.isLoggedIn, server.cart.isLoading, server.cart.data, smart.guestItems, products])

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalPrice = rows.reduce((s, r) => s + r.line, 0)

  if (smart.isLoggedIn && server.cart.isLoading) {
    return <div className="container-max py-10">불러오는 중…</div>
  }

  return (
    <div className="container-max py-10">
      <h1 className="text-2xl font-bold mb-6">장바구니</h1>

      {rows.length === 0 ? (
        <div className="text-gray-600">
          장바구니가 비었습니다. <Link to="/" className="underline">상품 보러가기</Link>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {rows.map(it => (
              <li key={it.productId} className="py-4 flex items-center gap-4">
                <img
                  src={it.images[0] || 'https://via.placeholder.com/80x80?text=No+Image'}
                  alt=""
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-600">{it.price.toLocaleString()}원</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 border rounded"
                          onClick={() => smart.setQty(it.productId, Math.max(1, it.qty - 1))}>-</button>
                  <span className="w-8 text-center">{it.qty}</span>
                  <button className="px-2 border rounded"
                          onClick={() => smart.setQty(it.productId, it.qty + 1)}>+</button>
                </div>
                <div className="w-24 text-right">{it.line.toLocaleString()}원</div>
                <button className="ml-4 text-sm text-red-600"
                        onClick={() => smart.remove(it.productId)}>삭제</button>
              </li>
            ))}
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
  )
}

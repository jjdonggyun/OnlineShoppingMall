import { useQuery } from '@tanstack/react-query'
import Nav from '../components/Nav'

export default function MyOrders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const r = await fetch('/api/orders/my', { credentials: 'include' })
      if (!r.ok) throw new Error('FAILED')
      return r.json()
    }
  })

  if (isLoading) return <div>로딩중...</div>
  if (error) return <div>오류가 발생했습니다.</div>
  if (!data?.length) return <div className="min-h-screen bg-white"><Nav /><div className="container-max py-10">주문 내역이 없습니다.</div></div>

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10">
        <h1 className="text-2xl font-bold mb-6">내 주문 내역</h1>
        <ul className="space-y-6">
          {data.map((o: any) => (
            <li key={o.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
                <div className="font-semibold">{o.totalPrice.toLocaleString()}원</div>
              </div>
              <div className="text-sm text-gray-500 mb-2">{o.status}</div>
              <ul className="divide-y">
                {o.items.map((it: any, idx: number) => (
                  <li key={idx} className="flex items-center gap-3 py-2">
                    <img src={it.image || 'https://via.placeholder.com/60'} className="w-14 h-14 object-cover rounded" />
                    <div className="flex-1">
                      <div>{it.name}</div>
                      <div className="text-xs text-gray-600">{it.qty}개 × {it.price.toLocaleString()}원</div>
                      {it.option?.size && (
                        <div className="text-xs text-gray-500">{it.option.color} / {it.option.size}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

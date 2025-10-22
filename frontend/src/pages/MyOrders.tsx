import { useQuery } from '@tanstack/react-query'
import Nav from '../components/Nav'
import { Package } from 'lucide-react'

export default function MyOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const r = await fetch('/api/orders/my', { credentials: 'include' })
      if (!r.ok) throw new Error('FAILED')
      return r.json()
    },
  })

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* 상단 2뎁스 */}
      <div className="border-b bg-gray-50">
        <div className="container-max flex gap-6 px-4 py-3 text-sm font-medium">
          <a href="/me" className="pb-2 border-b-2 border-transparent text-gray-500 hover:text-black">내 정보</a>
          <a href="/orders" className="pb-2 border-b-2 border-black text-black">주문조회</a>
        </div>
      </div>

      <div className="container-max py-10">
        <div className="flex items-center gap-3 mb-6">
          <Package size={28} className="text-gray-600" />
          <h1 className="text-2xl font-bold">주문 내역</h1>
        </div>

        {isLoading && <div>로딩중...</div>}
        {!isLoading && !data?.length && <div>주문 내역이 없습니다.</div>}

        <ul className="space-y-5">
          {data?.map((o: any) => (
            <li key={o.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</span>
                <span className="text-sm font-medium">{o.status}</span>
              </div>
              <ul className="divide-y">
                {o.items.map((it: any, idx: number) => (
                  <li key={idx} className="flex gap-4 py-3">
                    <img
                      src={it.image || 'https://via.placeholder.com/80'}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-gray-500">
                        {it.option?.color && `${it.option.color} `}
                        {it.option?.size && `/ ${it.option.size}`}
                      </div>
                      <div className="text-sm text-gray-700">
                        {it.qty}개 × {it.price.toLocaleString()}원
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="text-right text-sm font-semibold mt-2">
                총 {o.totalPrice.toLocaleString()}원
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

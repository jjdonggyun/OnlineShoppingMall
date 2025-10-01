// pages/AdminSoldOut.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

type Row = {
  id: string
  name: string
  price: number
  images: string[]
  status: 'ACTIVE'|'SOLD_OUT'
  updatedAt: string
}

export default function AdminSoldOut() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<Row[]>({
    queryKey: ['admin','soldout'],
    queryFn: async () => {
      const r = await fetch('/api/products/admin/soldout/list', { credentials:'include' })
      if (!r.ok) throw new Error('UNAUTHORIZED')
      return r.json()
    }
  })

  async function resume(id: string) {
    const ok = confirm('이 상품을 판매 재개할까요?')
    if (!ok) return
    const r = await fetch(`/api/products/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'ACTIVE' })
    })
    if (r.ok) {
      await qc.invalidateQueries({ queryKey: ['admin','soldout'] })
      alert('판매 재개되었습니다.')
    } else {
      alert('실패했습니다.')
    }
  }

  if (isLoading) return <div className="container-max py-10">불러오는 중…</div>

  return (
    <div className="container-max py-10">
      <h1 className="text-2xl font-bold mb-6">품절 상품</h1>

      {!data?.length ? (
        <div className="text-gray-600">품절 상품이 없습니다.</div>
      ) : (
        <ul className="divide-y">
          {data.map(p => (
            <li key={p.id} className="py-4 flex items-center gap-4">
              <img src={p.images[0] || 'https://via.placeholder.com/80x80?text=No+Image'} className="w-20 h-20 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600">{p.price.toLocaleString()}원</div>
              </div>
              <Link to={`/admin/products/${p.id}/edit`} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">편집</Link>
              <button onClick={() => resume(p.id)} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50">판매 재개</button>
              <Link to={`/products/${p.id}`} className="text-sm underline">상세보기</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

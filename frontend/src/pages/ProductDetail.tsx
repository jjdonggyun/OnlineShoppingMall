import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Product } from '../components/ProductCard'

export default function ProductDetail() {
  const { id } = useParams()
  const { data } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await fetch('/api/products')
      const all = await r.json() as Product[]
      return all.find(p => p.id === id)
    }
  })
  if (!data) return <div className="container-max py-20">로딩중...</div>
  return (
    <div>
      <div className="container-max py-4">
        <Link to="/" className="text-sm text-gray-600">← 목록으로</Link>
      </div>
      <div className="container-max grid md:grid-cols-2 gap-8 py-6">
        <img src={data.image} alt={data.name} className="w-full rounded-xl object-cover" />
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-xl font-semibold mt-2">{data.price.toLocaleString()}원</div>
          <button className="mt-6 px-6 py-3 rounded-xl bg-black text-white">장바구니</button>
        </div>
      </div>
    </div>
  )
}

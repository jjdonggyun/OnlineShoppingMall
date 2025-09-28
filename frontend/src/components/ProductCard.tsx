import { Link } from 'react-router-dom'

export interface Product {
  id: string
  name: string
  price: number
  image: string
  badge?: string
}

export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link to={`/products/${p.id}`} className="group block">
      <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100">
        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
      </div>
      <div className="mt-2 space-y-1">
        <div className="text-sm text-gray-700 line-clamp-2">{p.name}</div>
        <div className="font-semibold">{p.price.toLocaleString()}원</div>
        {p.badge && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">{p.badge}</span>}
      </div>
    </Link>
  )
}

// components/ProductCard.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export type Product = {
  id: string
  name: string
  price: number
  images: string[]   // ← 변경
  badge?: string
}

export default function ProductCard({ p }: { p: Product }) {
  const imgs = p.images?.length ? p.images : ['https://via.placeholder.com/600x800?text=No+Image']
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)

  // 2초마다 다음 이미지
  useEffect(() => {
    if (imgs.length <= 1) return
    timer.current = window.setInterval(() => {
      setIdx(i => (i + 1) % imgs.length)
    }, 2000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [imgs.length])

  const display = useMemo(() => imgs[idx], [imgs, idx])

  return (
    <Link to={`/products/${p.id}`} className="block">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
        <img src={display} alt={p.name} className="w-full h-full object-cover" />
      </div>
      <div className="mt-2 text-sm">
        <div className="font-medium">{p.name} {p.badge && <span className="ml-1 text-rose-500">[{p.badge}]</span>}</div>
        <div className="text-gray-600">{p.price.toLocaleString()}원</div>
      </div>
    </Link>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export type Product = {
  id: string
  name: string
  price: number
  images: string[]
  badge?: string
  status: 'ACTIVE' | 'SOLD_OUT'
  categories?: string[]
}

export default function ProductCard({
  p,
  onRemove,
}: {
  p: Product
  onRemove?: (id: string) => void   // ★ 추가: 제거 콜백
}) {
  const imgs = p.images?.length ? p.images : ['https://via.placeholder.com/600x800?text=No+Image']
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (imgs.length <= 1) return
    timer.current = window.setInterval(() => {
      setIdx(i => (i + 1) % imgs.length)
    }, 2000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [imgs.length])

  const display = useMemo(() => imgs[idx], [imgs, idx])

  return (
    <div className="relative group">
      <Link to={`/products/${p.id}`} className="block">
        {/* 이미지 영역 */}
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
          <img src={display} alt={p.name} className="w-full h-full object-cover" />
        </div>

        {/* 상품명/가격 영역 */}
        <div className="mt-2 text-sm">
          <div className="font-medium">
            {p.name}
            {p.badge && <span className="ml-1 text-rose-500">[{p.badge}]</span>}
          </div>
          <div className="text-gray-600">{p.price.toLocaleString()}원</div>
        </div>
      </Link>

      {/* ★ 제거 버튼 (관리자 전용) */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault()    // 링크 이동 막기
            e.stopPropagation()
            onRemove(p.id)
          }}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/90 border shadow-sm 
                     hover:bg-red-100 text-red-600 hidden group-hover:block"
        >
          제거
        </button>
      )}
    </div>
  )
}

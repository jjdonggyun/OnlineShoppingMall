import { useEffect, useMemo, useRef, useState } from 'react' // 상태/이펙트 관리 (Mendix의 Nanoflow + Attribute listener와 유사)
import { Link } from 'react-router-dom'  // 클릭 시 상세 페이지 이동

// 상품 데이터 타입 정의 (Mendix의 Entity와 유사)
export type Product = {
  id: string
  name: string
  price: number
  images: string[]   // 여러 장의 상품 이미지
  badge?: string     // NEW, BEST 같은 라벨
  status?: 'ACTIVE' | 'SOLD_OUT'
}

export default function ProductCard({ p }: { p: Product }) {
  // 이미지 배열이 없으면 기본 placeholder 이미지 사용
  const imgs = p.images?.length ? p.images : ['https://via.placeholder.com/600x800?text=No+Image']
  
  const [idx, setIdx] = useState(0)         // 현재 보여줄 이미지 인덱스
  const timer = useRef<number | null>(null) // 이미지 자동 전환용 타이머 저장소

  // 2초마다 다음 이미지로 변경 (Mendix의 "Timer widget" 같은 동작)
  useEffect(() => {
    if (imgs.length <= 1) return             // 이미지가 1장 이하일 경우 자동 전환 안함
    timer.current = window.setInterval(() => {
      setIdx(i => (i + 1) % imgs.length)     // 다음 이미지로 순환
    }, 2000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [imgs.length])

  // 현재 표시할 이미지 계산 (메모이제이션: 성능 최적화)
  const display = useMemo(() => imgs[idx], [imgs, idx])

  return (
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
  )
}

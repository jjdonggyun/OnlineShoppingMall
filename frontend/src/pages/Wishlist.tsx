// src/pages/Wishlist.tsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../stores/auth'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Nav from '../components/Nav'

export default function WishlistPage() {
  const { user } = useAuth(s => ({ user: s.user }))
  const nav = useNavigate()

  // ✅ 비로그인 접근 시 로그인으로
  useEffect(() => {
    if (!user) nav('/login?next=/wishlist', { replace: true })
  }, [user, nav])

  const uid = user?.uid || 'anon'
  const { data = [], isLoading } = useQuery({
    queryKey: ['wishlist', 'populated', uid], // ✅ 유저별로 분리
    enabled: !!user,                           // ✅ 비로그인 시 요청 안 함
    queryFn: async () => {
      const r = await fetch('/api/wishlist?populate=1', { credentials: 'include' })
      if (!r.ok) return []
      return r.json()
    },
    staleTime: 30_000,
  })

  return (
    <div className="min-h-screen bg-white">
      <Nav/>
      <div className="container-max py-10">
        <h1 className="text-2xl font-bold mb-6">찜한 상품</h1>
        {isLoading ? '불러오는 중…' : (
          data.length === 0 ? (
            <div className="text-gray-600">찜한 상품이 없습니다.</div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.map((p:any) => <ProductCard key={p.id} p={p} />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}

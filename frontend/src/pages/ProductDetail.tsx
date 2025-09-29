import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Product } from '../components/ProductCard'
import { useEffect, useState } from 'react'
import { useAuth } from '../stores/auth'

export default function ProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth(s => ({ user: s.user }))
  const { data } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`)
      if (!r.ok) throw new Error('NOT_FOUND')
      return r.json() as Promise<Product & { description?: string }>
    }
  })


  const [idx, setIdx] = useState(0)
  const imgs = data?.images?.length ? data.images : ['https://via.placeholder.com/600x800?text=No+Image']

  useEffect(() => { setIdx(0) }, [id])

  if (!data) return <div className="container-max py-20">로딩중...</div>

  function prev() { setIdx(i => (i - 1 + imgs.length) % imgs.length) }
  function next() { setIdx(i => (i + 1) % imgs.length) }
  function go(n: number) { setIdx(n) }

  async function onDelete() {
    if (!id) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    const r = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!r.ok) {
      alert('삭제 실패')
      return
    }
    // 목록 캐시 갱신 후 이동
    qc.invalidateQueries({ queryKey: ['products'] })
    nav('/')
  }

  return (
    <div>
      <div className="container-max py-4">
        <Link to="/" className="text-sm text-gray-600">← 목록으로</Link>
        {user?.role === 'ADMIN' && (
          <button
            onClick={onDelete}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        )}
      </div>

      <div className="container-max grid md:grid-cols-2 gap-8 py-6">
        {/* 이미지 영역 */}
        <div className="relative">
          <img src={imgs[idx]} alt={`${data.name}-${idx + 1}`} className="w-full rounded-xl object-cover" />
          {imgs.length > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">
                &lt;
              </button>
              <button onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 grid place-items-center shadow">
                &gt;
              </button>
            </>
          )}
          {imgs.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {imgs.map((src, i) => (
                <button key={i} onClick={() => go(i)}
                  className={`border rounded-lg overflow-hidden ${i === idx ? 'ring-2 ring-black' : ''}`}>
                  <img src={src} alt={`thumb-${i + 1}`} className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-xl font-semibold mt-2">{data.price.toLocaleString()}원</div>
          {data.description && <p className="mt-4 text-gray-700 leading-relaxed">{data.description}</p>}
          <button className="mt-6 px-6 py-3 rounded-xl bg-black text-white">장바구니</button>
        </div>
      </div>
    </div>
  )
}

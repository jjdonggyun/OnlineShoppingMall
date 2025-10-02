// pages/ProductEdit.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Nav from '../components/Nav'

export default function ProductEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`)
      if (!r.ok) throw new Error('NOT_FOUND')
      return r.json() as Promise<{
        id: string, name: string, price: number, badge?: string,
        description?: string, images: string[], status: 'ACTIVE' | 'SOLD_OUT',
        categories?: string[]
      }>
    }
  })

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [badge, setBadge] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'SOLD_OUT'>('ACTIVE')
  const [images, setImages] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // ★ 카테고리 편집 상태
  const [catInput, setCatInput] = useState('')
  const [cats, setCats] = useState<string[]>([])

  // 초기 값 주입
  if (!isLoading && data && name === '' && price === '') {
    setName(data.name)
    setPrice(data.price)
    setBadge(data.badge || '')
    setDesc(data.description || '')
    setStatus(data.status)
    setCats(data.categories ?? [])
  }

  function addCatFromInput() {
    const parts = catInput.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    setCats(prev => Array.from(new Set([...prev, ...parts])))
    setCatInput('')
  }
  function removeCat(c: string) {
    setCats(prev => prev.filter(x => x !== c))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      setSaving(true)
      if (images && images.length > 0) {
        const fd = new FormData()
        fd.append('name', name)
        fd.append('price', String(price))
        fd.append('badge', badge)
        fd.append('description', desc)
        fd.append('status', status)
        cats.forEach(c => fd.append('categories', c))
        Array.from(images).forEach(f => fd.append('images', f))

        const r = await fetch(`/api/products/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          body: fd
        })
        if (!r.ok) throw new Error('FAIL')
      } else {
        const r = await fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, price, badge, description: desc, status, categories: cats })
        })
        if (!r.ok) throw new Error('FAIL')
      }
      alert('수정되었습니다.')
      nav(`/products/${id}`)
    } catch {
      setErr('수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !data) return <div className="container-max py-10">불러오는 중…</div>

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">상품 편집</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="상품명"
                 value={name} onChange={e => setName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="가격" type="number"
                 value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
          <input className="w-full border rounded px-3 py-2" placeholder="배지(NEW/BEST 등)"
                 value={badge} onChange={e => setBadge(e.target.value)} />
          <textarea className="w-full border rounded px-3 py-2 min-h-[120px]" placeholder="상세 설명"
                    value={desc} onChange={e => setDesc(e.target.value)} />

          {/* ★ 카테고리 편집 */}
          <div>
            <label className="text-sm">카테고리</label>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="콤마 또는 Enter로 추가"
                value={catInput}
                onChange={e => setCatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addCatFromInput()
                  }
                }}
              />
              <button type="button" className="px-3 py-2 rounded border" onClick={addCatFromInput}>추가</button>
            </div>
            {cats.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {cats.map(c => (
                  <span key={c} className="text-xs px-2 py-1 rounded-full border flex items-center gap-1">
                    {c}
                    <button type="button" className="text-gray-500" onClick={() => removeCat(c)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">이미지 교체(선택)</label>
            <input type="file" multiple accept="image/*" onChange={e => setImages(e.target.files)} />
            <div className="text-xs text-gray-500 mt-1">선택하면 기존 이미지를 새 이미지로 교체합니다. 선택하지 않으면 유지됩니다.</div>
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-2">
            <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">{saving ? '저장 중…' : '저장'}</button>
            <button type="button" className="px-4 py-2 rounded border" onClick={() => nav(-1)}>취소</button>
          </div>
        </form>
      </div>
    </div>
  )
}

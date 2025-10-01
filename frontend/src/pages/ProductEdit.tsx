// pages/ProductEdit.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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
        description?: string, images: string[], status: 'ACTIVE'|'SOLD_OUT'
      }>
    }
  })

  const [name,setName] = useState('')
  const [price,setPrice] = useState<number | ''>('')
  const [badge,setBadge] = useState('')
  const [desc,setDesc] = useState('')
  const [status,setStatus] = useState<'ACTIVE'|'SOLD_OUT'>('ACTIVE')
  const [images,setImages] = useState<FileList | null>(null)
  const [saving,setSaving] = useState(false)
  const [err,setErr] = useState<string | null>(null)

  // 초기 값 주입
  if (!isLoading && data && name === '' && price === '') {
    setName(data.name)
    setPrice(data.price)
    setBadge(data.badge || '')
    setDesc(data.description || '')
    setStatus(data.status)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      setSaving(true)
      // 파일이 있으면 FormData(이미지 교체), 없으면 JSON PATCH
      if (images && images.length > 0) {
        const fd = new FormData()
        fd.append('name', name)
        fd.append('price', String(price))
        fd.append('badge', badge)
        fd.append('description', desc)
        fd.append('status', status)
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
          body: JSON.stringify({ name, price, badge, description: desc, status })
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
    <div className="container-max py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">상품 편집</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded px-3 py-2" placeholder="상품명" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="가격" type="number" value={price} onChange={e=>setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
        <input className="w-full border rounded px-3 py-2" placeholder="배지(NEW/BEST 등)" value={badge} onChange={e=>setBadge(e.target.value)} />
        <textarea className="w-full border rounded px-3 py-2 min-h-[120px]" placeholder="상세 설명" value={desc} onChange={e=>setDesc(e.target.value)} />

        <div className="flex items-center gap-3">
          <label className="text-sm">상태</label>
          <select className="border rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="ACTIVE">판매중</option>
            <option value="SOLD_OUT">품절</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">이미지 교체(선택)</label>
          <input type="file" multiple accept="image/*" onChange={e=>setImages(e.target.files)} />
          <div className="text-xs text-gray-500 mt-1">선택하면 기존 이미지를 새 이미지로 교체합니다. 선택하지 않으면 유지됩니다.</div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">{saving ? '저장 중…' : '저장'}</button>
          <button type="button" className="px-4 py-2 rounded border" onClick={()=>nav(-1)}>취소</button>
        </div>
      </form>
    </div>
  )
}

// pages/ProductNew.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import Nav from '../components/Nav'

export default function ProductNew() {
  const nav = useNavigate()
  const { user } = useAuth(s => ({ user: s.user }))

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [desc, setDesc] = useState('')
  const [badge, setBadge] = useState('')
  const [images, setImages] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // ★ 카테고리 태그 UI
  const [catInput, setCatInput] = useState('')
  const [cats, setCats] = useState<string[]>([])

  if (!user || user.role !== 'ADMIN') {
    return <div className="container-max py-20">권한이 없습니다.</div>
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

    if (!name || !price) { setErr('상품명과 가격은 필수입니다.'); return }
    if (!images || images.length === 0) { setErr('이미지를 1장 이상 선택하세요.'); return }

    try {
      setSaving(true)
      const fd = new FormData()
      fd.append('name', name)
      fd.append('price', String(price))
      if (desc) fd.append('description', desc)
      if (badge) fd.append('badge', badge)
      // ★ 카테고리 전송 (multipart에서는 같은 키로 여러 번 append 권장)
      cats.forEach(c => fd.append('categories', c))

      Array.from(images).forEach(f => fd.append('images', f))

      const r = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        body: fd
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(data?.error || '등록에 실패했습니다.'); return }
      nav(`/products/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">상품 등록</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="상품명"
                 value={name} onChange={e => setName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="가격" type="number"
                 value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
          <input className="w-full border rounded px-3 py-2" placeholder="배지(선택: NEW/BEST 등)"
                 value={badge} onChange={e => setBadge(e.target.value)} />
          <textarea className="w-full border rounded px-3 py-2 min-h-[120px]" placeholder="상세 설명(선택)"
                    value={desc} onChange={e => setDesc(e.target.value)} />

          {/* ★ 카테고리 태그 입력 */}
          <div>
            <label className="block text-sm mb-1">카테고리(여러 개 가능)</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="예: 남성, 아우터"
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
            <label className="block text-sm mb-1">이미지(여러 장 선택 가능)</label>
            <input type="file" multiple accept="image/*" onChange={e => setImages(e.target.files)} />
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-2">
            <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
              {saving ? '등록 중…' : '등록'}
            </button>
            <button type="button" className="px-4 py-2 rounded border" onClick={() => nav(-1)}>취소</button>
          </div>
        </form>
      </div>
    </div>
  )
}

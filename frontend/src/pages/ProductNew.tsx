import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import Nav from '../components/Nav'
import VariantEditor from '../components/VariantEditor'
import type { Variant } from '../types/product'
import { useAdminHashtags } from '../hooks/useHashtags'
import type { Hashtag } from '../hooks/useHashtags'

export default function ProductNew() {
  const nav = useNavigate()
  const { user } = useAuth(s => ({ user: s.user }))
  const { data: hashtags = [] } = useAdminHashtags()

  const [productNo, setProductNo] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [desc, setDesc] = useState('')
  const [badge, setBadge] = useState('')
  const [visible, setVisible] = useState(true)
  const [images, setImages] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 선택값(해시태그 id 기준으로 보관)
  const [menuIds, setMenuIds] = useState<string[]>([])     // ★ MENU 추가
  const [catIds, setCatIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [channelIds, setChannelIds] = useState<string[]>([])

  // 옵션
  const [variants, setVariants] = useState<Variant[]>([])

  // 새 파일 미리보기 URL
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  if (!user || user.role !== 'ADMIN') {
    return <div className="container-max py-20">권한이 없습니다.</div>
  }

  const menus = hashtags.filter(h => h.type === 'MENU')      // ★ MENU
  const cats = hashtags.filter(h => h.type === 'CATEGORY')
  const tags = hashtags.filter(h => h.type === 'TAG')
  const channels = hashtags.filter(h => h.type === 'CHANNEL')

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // 파일 선택 시 미리보기 URL 생성/해제
  useEffect(() => {
    if (!images) { setPreviewUrls([]); return }
    const urls = Array.from(images).map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [images])

  // 등록 화면은 서버 이미지가 아직 없으므로 imagePool = 미리보기들
  const imagePool = useMemo(() => previewUrls, [previewUrls])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!name || !price) return setErr('상품명과 가격은 필수입니다.')
    if (!images || images.length === 0) return setErr('이미지를 1장 이상 선택하세요.')

    try {
      setSaving(true)

      // 선택된 해시태그(id) → value 로 변환
      const menuValues = menus.filter(h => menuIds.includes(h.id)).map(h => h.value)      // ★ MENU
      const categoryValuesRaw = cats.filter(h => catIds.includes(h.id)).map(h => h.value)
      const tagValues = tags.filter(h => tagIds.includes(h.id)).map(h => h.value)
      const channelValues = channels.filter(h => channelIds.includes(h.id)).map(h => h.value)

      // CATEGORY 최종값 = CATEGORY + MENU (둘 다 카테고리성 링크로 쓰임)
      const categoryValues = Array.from(new Set([...menuValues, ...categoryValuesRaw]))    // ★ merge & dedup

      // CHANNEL → isNew / isBest 매핑
      const isNew = channelValues.includes('NEW')
      const isBest = channelValues.includes('BEST')

      const fd = new FormData()
      if (productNo) fd.append('productNo', productNo)
      fd.append('name', name)
      fd.append('price', String(price))
      if (desc) fd.append('description', desc)
      if (badge) fd.append('badge', badge)
      fd.append('visible', String(visible))

      categoryValues.forEach(c => fd.append('categories', c))
      tagValues.forEach(t => fd.append('tags', t))
      fd.append('overrides', JSON.stringify({ isNew, isBest }))

      // VariantEditor에서 선택한 coverImage 포함
      fd.append('variants', JSON.stringify(variants))

      // 이미지 파일들
      Array.from(images).forEach(f => fd.append('images', f))

      const r = await fetch('/api/products', { method: 'POST', credentials: 'include', body: fd })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) return setErr(data?.error || '등록 실패')
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
        <form onSubmit={onSubmit} className="space-y-6">
          {/* 기본 */}
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="상품번호(선택)"
            value={productNo}
            onChange={e => setProductNo(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="상품명"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="가격"
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            placeholder="상세 설명(선택)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />

          {/* 노출 */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
            노출 여부
          </label>

          {/* MENU (Nav 메뉴에 쓰이는 카테고리) */}
          <Selector title="메뉴(상단 내비 카테고리)" items={menus} selected={menuIds} onToggle={id => toggle(setMenuIds, id)} />

          {/* CATEGORY */}
          <Selector title="카테고리(#표시로 보임)" items={cats} selected={catIds} onToggle={id => toggle(setCatIds, id)} />

          {/* TAG */}
          <Selector title="태그(상품 옆 태그)" items={tags} selected={tagIds} onToggle={id => toggle(setTagIds, id)} tagStyle />

          {/* CHANNEL (NEW/BEST 등) */}
          <div className="text-xs text-gray-500 mb-1">
            NEW/BEST 섹션에 상품을 고정 노출합니다. 판매지표와 무관하게 상단에 보여져요.
          </div>
          <Selector title="채널 고정" items={channels} selected={channelIds} onToggle={id => toggle(setChannelIds, id)} accent="green" />

          {/* 이미지 먼저 업로드 → 아래 Variant에서 대표 이미지 선택 */}
          <div>
            <label className="block text-sm mb-1">이미지(여러 장 선택 가능)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setImages(e.target.files)}
            />
            {previewUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {previewUrls.map((u) => (
                  <img key={u} src={u} alt="preview" className="w-full h-20 object-cover rounded border" />
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              올린 이미지는 아래 “대표 이미지 선택”에서 곧바로 고를 수 있어요.
            </div>
          </div>

          {/* 옵션/대표 이미지 선택 (imagePool 전달) */}
          <VariantEditor value={variants} onChange={setVariants} imagePool={imagePool} />

          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button disabled={saving} className="px-4 py-2 rounded bg-black text-white w-full">
            {saving ? '등록 중…' : '등록'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Selector({
  title,
  items,
  selected,
  onToggle,
  tagStyle,
  accent = 'gray'
}: {
  title: string
  items: Hashtag[]
  selected: string[]
  onToggle: (id: string) => void
  tagStyle?: boolean
  accent?: 'gray' | 'green'
}) {
  const on = accent === 'green' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-900 text-white border-gray-900'
  return (
    <div className="border rounded-lg p-3">
      <div className="font-medium mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map(h => {
          const checked = selected.includes(h.id)
          const inactive = !h.active
          return (
            <label
              key={h.id}
              className={[
                'px-3 py-1.5 rounded-full border cursor-pointer text-sm',
                checked ? on : 'hover:bg-gray-50',
                inactive ? 'opacity-70 ring-1 ring-dashed' : ''
              ].join(' ')}
            >
              <input type="checkbox" className="hidden" checked={checked} onChange={() => onToggle(h.id)} />
              {tagStyle ? `#${h.label}` : h.label}{h.emoji && <span className="ml-1">{h.emoji}</span>}
              {inactive && <span className="ml-2 text-xs text-gray-500">(비노출)</span>}
            </label>
          )
        })}
      </div>
    </div>
  )
}

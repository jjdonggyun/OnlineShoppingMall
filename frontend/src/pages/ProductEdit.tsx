import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'
import VariantEditor from '../components/VariantEditor'
import type { Product, Variant } from '../types/product'
import { useAdminHashtags } from '../hooks/useHashtags'
import type { Hashtag } from '../hooks/useHashtags'

export default function ProductEdit() {
  const { id } = useParams()
  const nav = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await fetch(`/api/products/${id}`)
      if (!r.ok) throw new Error('NOT_FOUND')
      return r.json() as Promise<Product>
    }
  })

  const { data: hashtags = [] } = useAdminHashtags()
  const menus = useMemo(() => hashtags.filter(h => h.type === 'MENU'), [hashtags])           // ★ MENU
  const cats = useMemo(() => hashtags.filter(h => h.type === 'CATEGORY'), [hashtags])
  const tags = useMemo(() => hashtags.filter(h => h.type === 'TAG'), [hashtags])
  const channels = useMemo(() => hashtags.filter(h => h.type === 'CHANNEL'), [hashtags])

  // 기본 필드
  const [productNo, setProductNo] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [badge, setBadge] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'SOLD_OUT'>('ACTIVE')
  const [visible, setVisible] = useState(true)

  // 선택값(id 보관)
  const [menuIds, setMenuIds] = useState<string[]>([])     // ★ MENU
  const [catIds, setCatIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [channelIds, setChannelIds] = useState<string[]>([])

  // 옵션/이미지
  const [variants, setVariants] = useState<Variant[]>([])
  const [images, setImages] = useState<FileList | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([]) // 새 파일 미리보기

  // 새 파일 선택 시 미리보기 URL 구성
  useEffect(() => {
    if (!images) { setPreviewUrls([]); return }
    const urls = Array.from(images).map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [images])

  // imagePool = 기존 서버 이미지 + 이번에 올릴 이미지 미리보기
  const imagePool = useMemo(() => {
    const exist = (data?.images ?? [])
    return [...exist, ...previewUrls]
  }, [data?.images, previewUrls])

  // 상태
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 최초 로드 → 상태 채우기
  useEffect(() => {
    if (!isLoading && data) {
      setProductNo(data.productNo || '')
      setName(data.name)
      setPrice(data.price)
      setBadge(data.badge || '')
      setDesc(data.description || '')
      setStatus(data.status)
      setVisible((data as any).visible ?? true)
      setVariants(data.variants ?? [])

      // 역매핑: value → id (CATEGORY와 MENU 둘 다 categories로 간주)
      const byValueForCats = new Map(
        hashtags
          .filter(h => h.type === 'CATEGORY' || h.type === 'MENU')   // ★ 둘 다 카테고리성
          .map(h => [h.value, h.id] as const)
      )

      const byValueForTags = new Map(tags.map(h => [h.value, h.id] as const))

      setCatIds((data.categories ?? [])
        .map(v => byValueForCats.get(v))
        .filter(Boolean) as string[])

      setMenuIds((data.categories ?? [])
        .map(v => byValueForCats.get(v))
        .filter(id => id && menus.find(m => m.id === id)) as string[])  // MENU에 해당하는 것만 추림

      setTagIds((data.tags ?? [])
        .map(v => byValueForTags.get(v))
        .filter(Boolean) as string[])

      const isNew = !!data.overrides?.isNew
      const isBest = !!data.overrides?.isBest
      const byValueForChannels = new Map(channels.map(h => [h.value, h.id] as const))
      const pickedChannels = [
        isNew ? byValueForChannels.get('NEW') : null,
        isBest ? byValueForChannels.get('BEST') : null,
      ].filter(Boolean) as string[]
      setChannelIds(pickedChannels)
    }
  }, [isLoading, data, hashtags, menus, channels, tags])

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    try {
      setSaving(true)

      // id → value
      const menuValues = menus.filter(h => menuIds.includes(h.id)).map(h => h.value)               // ★ MENU
      const categoryValuesRaw = cats.filter(h => catIds.includes(h.id)).map(h => h.value)
      const tagValues = tags.filter(h => tagIds.includes(h.id)).map(h => h.value)
      const channelValues = channels.filter(h => channelIds.includes(h.id)).map(h => h.value)

      // 최종 카테고리 = MENU + CATEGORY (중복 제거)
      const categoriesFinal = Array.from(new Set([...menuValues, ...categoryValuesRaw]))            // ★ merge

      // CHANNEL → isNew/isBest
      const overrides = {
        isNew: channelValues.includes('NEW'),
        isBest: channelValues.includes('BEST'),
      }

      let r: Response
      if (images && images.length > 0) {
        const fd = new FormData()
        fd.append('productNo', productNo)
        fd.append('name', name)
        fd.append('price', String(price))
        fd.append('badge', badge)
        fd.append('description', desc)
        fd.append('status', status)
        fd.append('visible', String(visible))
        categoriesFinal.forEach(c => fd.append('categories', c))
        tagValues.forEach(t => fd.append('tags', t))
        fd.append('overrides', JSON.stringify(overrides))
        fd.append('variants', JSON.stringify(variants))
        Array.from(images).forEach(f => fd.append('images', f))
        r = await fetch(`/api/products/${id}`, { method: 'PATCH', credentials: 'include', body: fd })
      } else {
        const payload = {
          productNo,
          name,
          price,
          badge,
          description: desc,
          status,
          visible,
          categories: categoriesFinal,
          tags: tagValues,
          overrides,
          variants
        }
        r = await fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }
      if (!r.ok) throw new Error('FAIL')

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
      <form onSubmit={onSubmit} className="space-y-6">
          {/* 기본 */}
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="상품번호"
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
            placeholder="가격(숫자)"
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            placeholder="상세 설명"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />

          {/* 노출/상태 */}
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
              노출 여부
            </label>
            <label className="text-sm flex items-center gap-2">
              상태
              <select
                className="border rounded px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="ACTIVE">판매중</option>
                <option value="SOLD_OUT">품절</option>
              </select>
            </label>
          </div>

          {/* MENU */}
          <Selector title="메뉴(상단 내비 카테고리)" items={menus} selected={menuIds} onToggle={id => toggle(setMenuIds, id)} />

          {/* CATEGORY */}
          <Selector title="카테고리(#표시로 보임)" items={cats} selected={catIds} onToggle={id => toggle(setCatIds, id)} />

          {/* TAG */}
          <Selector title="태그(상품 옆 태그)" items={tags} selected={tagIds} onToggle={id => toggle(setTagIds, id)} tagStyle />

          {/* CHANNEL */}
          <div className="text-xs text-gray-500">
            NEW/BEST 섹션에 상품을 고정 노출합니다. 판매지표와 무관하게 상단에 보여져요.
          </div>
          <Selector
            title="채널 고정(NEW/BEST)"
            items={channels}
            selected={channelIds}
            onToggle={id => toggle(setChannelIds, id)}
            accent="green"
          />

          {/* 옵션/이미지 */}
          <VariantEditor value={variants} onChange={setVariants} imagePool={imagePool} />

          <div>
            <label className="block text-sm mb-1">이미지 교체(업로드)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setImages(e.target.files)}
            />
            {/* 업로드 미리보기 */}
            {previewUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {previewUrls.map((u) => (
                  <img key={u} src={u} alt="preview" className="w-full h-20 object-cover rounded border" />
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              올린 이미지는 위 “대표 이미지 선택”에서도 바로 선택할 수 있어요.
            </div>
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          <div className="flex gap-2">
            <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
              {saving ? '저장 중…' : '저장'}
            </button>
            <button type="button" className="px-4 py-2 rounded border" onClick={() => nav(-1)}>취소</button>
          </div>
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
              title={h.type === 'TAG' ? `#${h.value}` : h.value}
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

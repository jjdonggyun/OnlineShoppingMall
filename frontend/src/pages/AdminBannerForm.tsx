// src/pages/AdminBannerForm.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import Nav from '../components/Nav'

type BannerDetail = {
  id: string
  title?: string
  image: string
  imageMobile?: string
  link?: string
  active: boolean
  order: number
  startsAt: string | null
  endsAt: string | null
  device: 'ALL' | 'WEB' | 'MOBILE'
}

export default function AdminBannerForm() {
  const nav = useNavigate()
  const { id } = useParams<{ id: string }>()
  const editing = !!id

  const { data, isLoading, error } = useQuery<BannerDetail>({
    queryKey: ['admin', 'banners', id],
    enabled: editing,
    queryFn: async () => {
      const r = await fetch(`/api/banners/admin/${id}`, { credentials: 'include' })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        const err: any = new Error(text || r.statusText)
        err.status = r.status
        throw err
      }
      return r.json()
    }
  })

  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [active, setActive] = useState(true)
  const [order, setOrder] = useState<number | ''>('')
  const [startsAt, setStartsAt] = useState<string>('') // yyyy-MM-dd
  const [endsAt, setEndsAt] = useState<string>('')     // yyyy-MM-dd
  const [device, setDevice] = useState<'ALL' | 'WEB' | 'MOBILE'>('ALL')

  const [image, setImage] = useState<File | null>(null)             // 웹/공용
  const [imageMobile, setImageMobile] = useState<File | null>(null) // 모바일 전용

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | undefined>()

  // 편집 모드일 때 초기값 바인딩
  useEffect(() => {
    if (!editing || !data) return
    setTitle(data.title ?? '')
    setLink(data.link ?? '')
    setActive(!!data.active)
    setOrder(
      typeof data.order === 'number'
        ? data.order
        : (data as any).order === '0'
          ? 0
          : ''
    )
    setStartsAt(data.startsAt ? String(data.startsAt).slice(0, 10) : '')
    setEndsAt(data.endsAt ? String(data.endsAt).slice(0, 10) : '')
    setDevice((data.device as any) || 'ALL')
  }, [editing, data])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(undefined)
    try {
      setSaving(true)
      const fd = new FormData()
      if (title) fd.append('title', title)
      if (link) fd.append('link', link)
      fd.append('active', String(active))
      if (order !== '') fd.append('order', String(order))
      if (startsAt) fd.append('startsAt', startsAt)
      if (endsAt) fd.append('endsAt', endsAt)
      fd.append('device', device)
      if (image) fd.append('image', image) // 웹/공용 이미지
      if (imageMobile) fd.append('imageMobile', imageMobile) // 모바일 전용 이미지

      const url = editing ? `/api/banners/admin/${id}` : '/api/banners/admin'
      const method = editing ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, credentials: 'include', body: fd })
      if (!r.ok) {
        const msg = await r.text().catch(() => '')
        throw new Error(msg || 'FAIL')
      }
      nav('/admin/banners')
    } catch (e: any) {
      setErr(e?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (editing && isLoading) {
    return <div className="container-max py-10">불러오는 중…</div>
  }
  if (editing && error) {
    const e = error as any
    const code = e?.status
    const msg =
      code === 401 ? '로그인이 필요합니다 (401)'
        : code === 403 ? '관리자 권한이 없습니다 (403)'
          : code === 404 ? '배너를 찾을 수 없습니다 (404)'
            : code === 400 ? '잘못된 요청입니다 (400): ' + (e?.message || '')
              : '조회 실패: ' + (e?.message || '')
    return <div className="container-max py-10 text-red-600">{msg}</div>
  }

  // 미리보기용 현재 이미지 URL (편집 모드만)
  const currentImage = editing && data?.image ? data.image : undefined
  const currentImageMobile = editing && data?.imageMobile ? data.imageMobile : undefined

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{editing ? '배너 편집' : '배너 추가'}</h1>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="제목(선택)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <input
              className="w-full border rounded px-3 py-2"
              placeholder="링크 URL(선택)"
              value={link}
              onChange={e => setLink(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                />
                활성
              </label>

              <input
                className="border rounded px-2 py-1 w-32"
                placeholder="우선순위"
                type="number"
                value={order}
                onChange={e => setOrder(e.target.value === '' ? '' : Number(e.target.value))}
              />

              <div className="flex items-center gap-2">
                <span className="text-sm">디바이스</span>
                <select
                  className="border rounded px-2 py-1"
                  value={device}
                  onChange={e => setDevice(e.target.value as any)}
                >
                  <option value="ALL">ALL(공용)</option>
                  <option value="WEB">WEB 전용</option>
                  <option value="MOBILE">MOBILE 전용</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="border rounded px-2 py-1"
                type="date"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
              />
              <span className="text-sm text-gray-500">~</span>
              <input
                className="border rounded px-2 py-1"
                type="date"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">이미지 (웹/공용) {editing && '(선택 시 교체)'}</label>
              {editing && currentImage && (
                <img src={currentImage} alt="current" className="w-full max-h-40 object-cover rounded border" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => setImage(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">권장 비율(웹): 16:6 등 가로형</p>
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">모바일 전용 이미지 (선택)</label>
              {editing && currentImageMobile && (
                <img src={currentImageMobile} alt="current mobile" className="w-full max-h-40 object-cover rounded border" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => setImageMobile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">권장 비율(모바일): 9:16 등 세로가 더 큰 가로형</p>
              <p className="text-xs text-gray-500">※ 미첨부 시 모바일에서도 웹/공용 이미지를 사용합니다.</p>
            </div>
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-2">
            <button
              disabled={saving}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => nav(-1)}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

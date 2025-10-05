import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { useAuth } from '../stores/auth'
import { useAdminHashtags } from '../hooks/hashtags'

type Type = 'MENU'|'CATEGORY'|'TAG'|'CHANNEL'

export default function AdminHashtags() {
  const { user } = useAuth(s => ({ user: s.user }))
  const nav = useNavigate()
  const qc = useQueryClient()

  // 권한 체크
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') nav('/', { replace: true })
  }, [user, nav])

  // 목록 타입 필터
  const [filterType, setFilterType] = useState<Type | 'ALL'>('ALL')
  const { data, isLoading } = useAdminHashtags(filterType === 'ALL' ? undefined : filterType)

  // 신규 생성 폼
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('')
  const [type, setType] = useState<Type>('MENU') // 기본: MENU 추가 용도
  const [value, setValue] = useState('')
  const [order, setOrder] = useState<number | ''>('')
  const [active, setActive] = useState(true)
  const canCreate = label && type && value

  async function createOne() {
    if (!canCreate) return
    const r = await fetch('/api/hashtags', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        label,
        emoji: emoji || undefined,
        type,
        value,
        active,
        order: order === '' ? 0 : Number(order)
      })
    })
    if (!r.ok) return alert('생성 실패')
    setLabel(''); setEmoji(''); setValue(''); setOrder(''); setActive(true)
    await qc.invalidateQueries({ queryKey: ['hashtags','admin'] })
  }

  async function updateOne(id: string, patch: Partial<{ label:string; emoji?:string; type:Type; value:string; active:boolean; order:number }>) {
    const r = await fetch(`/api/hashtags/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    if (!r.ok) return alert('수정 실패')
    await qc.invalidateQueries({ queryKey: ['hashtags','admin'] })
  }

  async function removeOne(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const r = await fetch(`/api/hashtags/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!r.ok) return alert('삭제 실패')
    await qc.invalidateQueries({ queryKey: ['hashtags','admin'] })
  }

  const sorted = useMemo(() =>
    (data ?? []).slice().sort((a,b) => (a.order ?? 0) - (b.order ?? 0)), [data])

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />

      <div className="mx-auto w-full max-w-[1100px] px-3 sm:px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">해시태그 관리</h1>
            <p className="text-sm text-gray-500 mt-1">
              Nav 메뉴/채널 및 메인 칩을 관리합니다. (type: MENU/CATEGORY/TAG/CHANNEL)
            </p>
          </div>
        </div>

        {/* 필터 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            className="border rounded px-3 py-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">ALL</option>
            <option value="MENU">MENU (Nav 상단 카테고리 메뉴)</option>
            <option value="CHANNEL">CHANNEL (NEW/BEST 등)</option>
            <option value="CATEGORY">CATEGORY (카테고리 칩)</option>
            <option value="TAG">TAG (태그 칩)</option>
          </select>
          <span className="text-xs text-gray-500">※ 목록은 order 순으로 정렬됩니다.</span>
        </div>

        {/* 생성 폼 */}
        <div className="mt-6 border rounded-xl p-4">
          <div className="grid gap-3 sm:grid-cols-6">
            <input
              className="border rounded px-3 py-2 sm:col-span-2"
              placeholder="라벨(노출 텍스트)"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 sm:col-span-1"
              placeholder="이모지(선택)"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2 sm:col-span-1"
              value={type}
              onChange={e => setType(e.target.value as Type)}
            >
              <option value="MENU">MENU (Nav 메뉴)</option>
              <option value="CHANNEL">CHANNEL (예: NEW/BEST)</option>
              <option value="CATEGORY">CATEGORY (카테고리 칩)</option>
              <option value="TAG">TAG (태그 칩)</option>
            </select>
            <input
              className="border rounded px-3 py-2 sm:col-span-1"
              placeholder="value (MENU/CATEGORY/TAG=이름, CHANNEL=NEW|BEST)"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 sm:col-span-1"
              type="number"
              placeholder="order"
              value={order}
              onChange={e => setOrder(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              active
            </label>
            <button
              disabled={!canCreate}
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
              onClick={createOne}
            >
              + 추가
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">order</th>
                <th className="py-2 pr-3">label</th>
                <th className="py-2 pr-3">emoji</th>
                <th className="py-2 pr-3">type</th>
                <th className="py-2 pr-3">value</th>
                <th className="py-2 pr-3">active</th>
                <th className="py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">불러오는 중…</td></tr>
              )}
              {sorted.map(h => (
                <tr key={h.id} className="border-b">
                  <td className="py-2 pr-3">
                    <input
                      className="w-20 border rounded px-2 py-1"
                      type="number"
                      defaultValue={h.order ?? 0}
                      onBlur={(e) => updateOne(h.id, { order: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="border rounded px-2 py-1"
                      defaultValue={h.label}
                      onBlur={(e) => updateOne(h.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-24 border rounded px-2 py-1"
                      defaultValue={h.emoji ?? ''}
                      onBlur={(e) => updateOne(h.id, { emoji: e.target.value || undefined })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className="border rounded px-2 py-1"
                      defaultValue={h.type as Type}
                      onChange={(e) => updateOne(h.id, { type: e.target.value as Type })}
                    >
                      <option value="MENU">MENU</option>
                      <option value="CHANNEL">CHANNEL</option>
                      <option value="CATEGORY">CATEGORY</option>
                      <option value="TAG">TAG</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="border rounded px-2 py-1"
                      defaultValue={h.value}
                      onBlur={(e) => updateOne(h.id, { value: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked={h.active ?? true}
                        onChange={(e) => updateOne(h.id, { active: e.target.checked })}
                      />
                      <span>active</span>
                    </label>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => removeOne(h.id)}
                      className="px-2 py-1 rounded border hover:bg-red-50 text-red-600"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {(!isLoading && sorted.length === 0) && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">항목이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav'

type Birth = { year: number; month: number; day: number }

function toBirthStruct(d?: string | Date | null): Birth {
  if (!d) return { year: 2000, month: 1, day: 1 }
  const dt = new Date(d)
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() }
}

export default function MyPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 읽기 전용
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')

  // 수정 가능
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('010-')
  const [smsOptIn, setSmsOptIn] = useState(true)
  const [emailOptIn, setEmailOptIn] = useState(true)
  const [birth, setBirth] = useState<Birth>({ year: 2000, month: 1, day: 1 })

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 120 }, (_, i) => now - i)
  }, [])
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' })
        if (!r.ok) throw new Error('UNAUTHORIZED')
        const u = await r.json()
        setEmail(u.email)
        setUserId(u.userId)
        setName(u.name ?? '')
        setPhone(u.phone ?? '010-')
        setSmsOptIn(!!u.smsOptIn)
        setEmailOptIn(!!u.emailOptIn)
        setBirth(toBirthStruct(u.birth))
      } catch (e) {
        setMsg('내 정보를 불러오지 못했습니다. 다시 로그인 해주세요.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!name.trim()) return setMsg('이름을 입력해 주세요.')
    if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(phone)) return setMsg('휴대폰 번호 형식을 확인해 주세요.')

    setSaving(true)
    try {
      const body = {
        name,
        phone,
        smsOptIn,
        emailOptIn,
        birth,
      }
      const r = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) {
        setMsg('저장에 실패했습니다.')
        return
      }
      // 서버가 최신값을 내려주므로 동기화
      setName(data.name)
      setPhone(data.phone)
      setSmsOptIn(!!data.smsOptIn)
      setEmailOptIn(!!data.emailOptIn)
      setBirth(toBirthStruct(data.birth))
      setMsg('저장되었습니다.')
    } catch {
      setMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container-max py-12">로딩 중…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">내 정보</h1>

        <form onSubmit={onSave} className="space-y-5">
          {/* 읽기 전용 필드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">이메일</label>
              <input className="w-full border rounded px-3 py-2 bg-gray-100" value={email} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">아이디</label>
              <input className="w-full border rounded px-3 py-2 bg-gray-100" value={userId} readOnly />
            </div>
          </div>

          {/* 수정 가능 필드 */}
          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">휴대폰 번호</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={phone}
              onChange={e=>setPhone(e.target.value.replace(/[^\d-]/g, ''))}
              placeholder="010-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">생년월일</label>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-2" value={birth.year} onChange={e=>setBirth(b=>({ ...b, year:Number(e.target.value) }))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="border rounded px-2 py-2" value={birth.month} onChange={e=>setBirth(b=>({ ...b, month:Number(e.target.value) }))}>
                {months.map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
              <select className="border rounded px-2 py-2" value={birth.day} onChange={e=>setBirth(b=>({ ...b, day:Number(e.target.value) }))}>
                {days.map(d => <option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium mb-1">SMS,KAKAO 수신여부</span>
              <label className="mr-4"><input type="radio" checked={smsOptIn} onChange={()=>setSmsOptIn(true)} /> <span className="ml-1">예</span></label>
              <label><input type="radio" checked={!smsOptIn} onChange={()=>setSmsOptIn(false)} /> <span className="ml-1">아니오</span></label>
            </div>
            <div>
              <span className="block text-sm font-medium mb-1">메일 수신여부</span>
              <label className="mr-4"><input type="radio" checked={emailOptIn} onChange={()=>setEmailOptIn(true)} /> <span className="ml-1">예</span></label>
              <label><input type="radio" checked={!emailOptIn} onChange={()=>setEmailOptIn(false)} /> <span className="ml-1">아니오</span></label>
            </div>
          </div>

          {msg && <div className="text-sm">{msg}</div>}

          <button disabled={saving} className="min-w-32 bg-black text-white rounded py-2 px-4">
            {saving ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>
    </div>
  )
}

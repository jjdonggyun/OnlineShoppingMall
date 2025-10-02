import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

type Birth = { year: number; month: number; day: number }

export default function Register() {
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')

  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const phone = `${phone1}-${phone2.trim()}-${phone3.trim()}`

  const [smsOptIn, setSmsOptIn] = useState(true)
  const [emailOptIn, setEmailOptIn] = useState(true)
  const [recommenderId, setRecommenderId] = useState('')

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 120 }).map((_, i) => now - i)
  }, [])
  const months = Array.from({ length: 12 }).map((_, i) => i + 1)
  const days = Array.from({ length: 31 }).map((_, i) => i + 1)
  const [birth, setBirth] = useState<Birth>({ year: 2011, month: 1, day: 1 })

  // 휴대폰 인증 상태
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null) // dev에서만 표시
  const [otpCode, setOtpCode] = useState('')
  const [phoneToken, setPhoneToken] = useState<string | null>(null)

  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (!name.trim()) return '이름을 입력해 주세요.'
    if (!userId.trim()) return '아이디를 입력해 주세요.'
    if (!/^[a-zA-Z0-9_.-]{4,20}$/.test(userId)) return '아이디는 4~20자 영문/숫자/._-만 가능합니다.'
    if (!email.trim()) return '이메일을 입력해 주세요.'
    if (!password || password.length < 6) return '비밀번호는 6자 이상이어야 합니다.'
    if (password !== password2) return '비밀번호 확인이 일치하지 않습니다.'
    if (!/^\d{3,4}$/.test(phone2) || !/^\d{4}$/.test(phone3)) return '휴대폰 번호를 정확히 입력해 주세요.'
    if (!phoneToken) return '휴대폰 인증을 완료해 주세요.'
    return null
  }

  async function requestOtp() {
    setMsg(null)
    if (!/^\d{3,4}$/.test(phone2) || !/^\d{4}$/.test(phone3)) {
      setMsg('휴대폰 번호를 정확히 입력해 주세요.')
      return
    }
    const r = await fetch('/api/auth/phone/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone })
    })
    const data = await r.json()
    if (!r.ok) { setMsg('인증 코드 요청에 실패했습니다.'); return }
    setOtpRequested(true)
    setOtpDevHint(data?.devCode || null) // 개발환경이면 6자리 보여줌
    setMsg('인증 코드를 발송했습니다. 5분 내 입력해 주세요.')
  }

  async function verifyOtp() {
    setMsg(null)
    if (!otpCode.trim()) { setMsg('인증 코드를 입력해 주세요.'); return }
    const r = await fetch('/api/auth/phone/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, code: otpCode.trim() })
    })
    const data = await r.json()
    if (!r.ok) {
      const m =
        data?.error === 'INVALID_CODE' ? '인증 코드가 올바르지 않습니다.' :
        data?.error === 'CODE_EXPIRED' ? '인증 코드가 만료되었습니다. 다시 요청해 주세요.' :
        data?.error === 'TOO_MANY_ATTEMPTS' ? '시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.' :
        '인증에 실패했습니다.'
      setMsg(m)
      return
    }
    setPhoneToken(data.phoneToken)
    setMsg('휴대폰 인증이 완료되었습니다.')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const v = validate()
    if (v) { setMsg(v); return }

    setLoading(true)
    try {
      const body = {
        email, password,
        name, userId, phone, birth,
        smsOptIn, emailOptIn,
        recommenderId: recommenderId || null,
        phoneToken, // ★ 필수
      }
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (!r.ok) {
        setMsg(
          data?.error === 'EMAIL_EXISTS' ? '이미 사용 중인 이메일입니다.' :
          data?.error === 'USERID_EXISTS' ? '이미 사용 중인 아이디입니다.' :
          data?.error === 'PHONE_NOT_VERIFIED' ? '휴대폰 인증을 다시 진행해 주세요.' :
          '가입에 실패했습니다.'
        )
        return
      }
      setMsg('가입이 완료되었습니다.')
      setTimeout(() => nav('/login'), 1500)
    } catch {
      setMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <Nav />
      <div className="container-max py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">회원가입</h1>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium mb-1">이름 *</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
          </div>

          {/* 아이디 */}
          <div>
            <label className="block text-sm font-medium mb-1">아이디 *</label>
            <input className="w-full border rounded px-3 py-2" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="영문/숫자 4~20자" />
          </div>

          {/* 비밀번호/확인 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호 *</label>
              <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6자 이상" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호 확인 *</label>
              <input className="w-full border rounded px-3 py-2" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} />
            </div>
          </div>

          {/* 휴대폰 + 인증 */}
          <div>
            <label className="block text-sm font-medium mb-1">휴대폰 번호 *</label>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-2" value={phone1} onChange={e=>setPhone1(e.target.value)}>
                {['010','011','016','017','018','019'].map(v=><option key={v} value={v}>{v}</option>)}
              </select>
              <input className="w-24 border rounded px-2 py-2" maxLength={4} value={phone2} onChange={e=>setPhone2(e.target.value.replace(/\D/g,''))}/>
              <input className="w-24 border rounded px-2 py-2" maxLength={4} value={phone3} onChange={e=>setPhone3(e.target.value.replace(/\D/g,''))}/>
              <button type="button" className="px-3 py-2 rounded border" onClick={requestOtp}>인증요청</button>
            </div>

            {otpRequested && (
              <div className="mt-3 flex items-center gap-2">
                <input className="border rounded px-3 py-2 flex-1" placeholder="인증코드 6자리" value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,''))} />
                <button type="button" className="px-3 py-2 rounded border" onClick={verifyOtp}>인증확인</button>
              </div>
            )}

            {phoneToken && <div className="text-xs text-green-700 mt-1">휴대폰 인증 완료</div>}
            {otpDevHint && <div className="text-xs text-gray-500 mt-1">개발용 코드: {otpDevHint}</div>}
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-sm font-medium mb-1">생년월일 *</label>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-2" value={birth.year} onChange={e=>setBirth(b=>({...b, year:Number(e.target.value)}))}>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select className="border rounded px-2 py-2" value={birth.month} onChange={e=>setBirth(b=>({...b, month:Number(e.target.value)}))}>
                {months.map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
              <select className="border rounded px-2 py-2" value={birth.day} onChange={e=>setBirth(b=>({...b, day:Number(e.target.value)}))}>
                {days.map(d=><option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
              </select>
            </div>
          </div>

          {/* 수신 여부 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium mb-1">SMS,KAKAO 수신여부 *</span>
              <label className="mr-4"><input type="radio" checked={smsOptIn} onChange={()=>setSmsOptIn(true)} /> <span className="ml-1">예</span></label>
              <label><input type="radio" checked={!smsOptIn} onChange={()=>setSmsOptIn(false)} /> <span className="ml-1">아니오</span></label>
            </div>
            <div>
              <span className="block text-sm font-medium mb-1">메일수신여부 *</span>
              <label className="mr-4"><input type="radio" checked={emailOptIn} onChange={()=>setEmailOptIn(true)} /> <span className="ml-1">예</span></label>
              <label><input type="radio" checked={!emailOptIn} onChange={()=>setEmailOptIn(false)} /> <span className="ml-1">아니오</span></label>
            </div>
          </div>

          {/* 이메일 / 추천인 */}
          <div>
            <label className="block text-sm font-medium mb-1">이메일 *</label>
            <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">추천인아이디</label>
            <input className="w-full border rounded px-3 py-2" value={recommenderId} onChange={e=>setRecommenderId(e.target.value)} placeholder="선택 입력" />
          </div>

          {msg && <div className="text-sm mt-1">{msg}</div>}

          <div className="flex gap-3">
            <button disabled={loading} className="min-w-32 bg-black text-white rounded py-2 px-4">
              {loading ? '처리 중…' : '저장'}
            </button>
            <button type="button" className="min-w-32 rounded border py-2 px-4" onClick={()=>nav(-1)}>취소</button>
          </div>
        </form>
      </div>
    </div>
  )
}

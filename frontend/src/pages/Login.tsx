import { useState } from 'react'
import { useAuth } from '../stores/auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const nav = useNavigate()
  const setAuth = useAuth(s=>s.setAuth)
  const [email,setEmail] = useState('admin@example.com')
  const [password,setPassword] = useState('admin1234')
  const [err,setErr] = useState<string|undefined>()
  const [emailNotVerified, setEmailNotVerified] = useState(false)   // ← 추가
  const [sending, setSending] = useState(false)                      // ← 추가


  async function onSubmit(e:React.FormEvent){
    e.preventDefault()
    setErr(undefined)
    setEmailNotVerified(false)
    const r = await fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ email, password })
    })
    if(!r.ok){
      const data = await r.json().catch(()=>({}))
      if (data?.error === 'EMAIL_NOT_VERIFIED') {                    // ← 추가
        setEmailNotVerified(true)
        setErr('이메일 미인증 상태입니다. 아래 버튼으로 인증 메일을 다시 받으세요.')
      } else {
        setErr('로그인 실패')
      }
      return
    }
    const data = await r.json()
    setAuth({ user: data.user, accessToken: data.accessToken })
    nav('/')
  }

    async function resend() {                                          // ← 추가
    try {
      setSending(true)
      const r = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify({ email })
      })
      if (r.ok) setErr('인증 메일을 재발송했습니다. 메일함을 확인해 주세요.')
      else setErr('재발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container-max py-20 max-w-md">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded px-3 py-2" placeholder="이메일" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="비밀번호" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
                {emailNotVerified && (                                          // ← 추가
          <div className="text-sm space-x-2">
            <button type="button" onClick={resend} className="underline">
              {sending ? '재발송 중…' : '인증 메일 재발송'}
            </button>
            <Link to="/verify-email" className="underline">인증 링크 재확인</Link>
          </div>
        )}
        <div className="text-sm text-gray-600">
          아직 계정이 없나요? <Link to="/register" className="underline">회원가입</Link>
        </div>
        <button className="w-full bg-black text-white rounded py-2">로그인</button>
      </form>
    </div>
  )
}

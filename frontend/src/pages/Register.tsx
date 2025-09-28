import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      const data = await r.json()
      if (!r.ok) {
        setMsg(data?.error === 'EMAIL_EXISTS' ? '이미 사용 중인 이메일입니다.' : '가입에 실패했습니다.')
        return
      }
      setMsg('가입이 완료되었습니다. 이메일함에서 인증 메일을 확인해 주세요.')
      // 2~3초 후 로그인 페이지로 이동
      setTimeout(() => nav('/login'), 2000)
    } catch {
      setMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-max py-20 max-w-md">
      <h1 className="text-2xl font-bold mb-6">회원가입</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="이메일"
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="비밀번호(6자 이상)"
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
        />
        {msg && <div className="text-sm">{msg}</div>}
        <button disabled={loading} className="w-full bg-black text-white rounded py-2">
          {loading ? '처리 중…' : '가입하기'}
        </button>
      </form>
    </div>
  )
}

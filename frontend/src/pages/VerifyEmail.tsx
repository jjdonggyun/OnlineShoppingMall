import { useEffect, useState } from 'react'

export default function VerifyEmail() {
  const [state, setState] = useState<'loading'|'ok'|'fail'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')
    const email = url.searchParams.get('email')
    if (!token || !email) {
      setState('fail'); setMessage('잘못된 인증 링크입니다.')
      return
    }
    ;(async () => {
      const r = await fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      })
      const data = await r.json()
      if (r.ok) {
        setState('ok'); setMessage('이메일 인증이 완료되었습니다. 로그인해 주세요.')
      } else {
        const map: Record<string,string> = {
          INVALID_TOKEN: '유효하지 않은 토큰입니다.',
          TOKEN_EXPIRED: '토큰이 만료되었습니다. 재발송해 주세요.',
          BAD_REQUEST: '잘못된 요청입니다.'
        }
        setState('fail'); setMessage(map[data?.error] || '인증에 실패했습니다.')
      }
    })()
  }, [])

  return (
    <div className="container-max py-20 max-w-md">
      <h1 className="text-2xl font-bold mb-6">이메일 인증</h1>
      {state === 'loading' && <p>확인 중…</p>}
      {state !== 'loading' && <p>{message}</p>}
    </div>
  )
}

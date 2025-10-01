// pages/ProductNew.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'

export default function ProductNew() {
  const nav = useNavigate()
  const { user } = useAuth(s => ({ user: s.user }))      // 로그인/권한 확인 (Mendix: Session/Account)

  // 폼 필드 상태 (Mendix: DataView 내부의 Attribute 값들)
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')    // 숫자 또는 빈값
  const [desc, setDesc] = useState('')
  const [badge, setBadge] = useState('')                 // NEW/BEST 등
  const [images, setImages] = useState<FileList | null>(null) // 다중 이미지 선택
  const [saving, setSaving] = useState(false)            // 저장 중 로딩 상태
  const [err, setErr] = useState<string | null>(null)    // 에러 메시지

  // 권한 체크: 관리자만 접근 가능 (Mendix: 페이지 접근 규칙/Visible-on-role)
  if (!user || user.role !== 'ADMIN') {
    return <div className="container-max py-20">권한이 없습니다.</div>
  }

  // 제출 핸들러 (Mendix: 마이크로플로우 on submit)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    // 필수값 검증 (Mendix: Validation feedback)
    if (!name || !price) { setErr('상품명과 가격은 필수입니다.'); return }
    if (!images || images.length === 0) { setErr('이미지를 1장 이상 선택하세요.'); return }

    try {
      setSaving(true)

      // FormData 생성 (Mendix: 파일 업로드 시 multipart/form-data로 전송)
      const fd = new FormData()
      fd.append('name', name)
      fd.append('price', String(price))
      if (desc)  fd.append('description', desc)
      if (badge) fd.append('badge', badge)

      // 다중 이미지 필드명은 백엔드와 동일해야 함 (여기선 'images')
      Array.from(images).forEach(f => fd.append('images', f))   // ← 백엔드 필드명과 반드시 일치

      // REST: 상품 생성 (POST /api/products)
      const r = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',                                // 인증 쿠키 포함
        body: fd                                               // Content-Type 자동 설정(multipart)
      })

      // 서버 응답 파싱 (에러 케이스 방어적 처리)
      const data = await r.json().catch(()=>({}))

      // 실패 처리: 서버에서 error 필드 제공 시 메시지 표시
      if (!r.ok) {
        setErr(data?.error || '등록에 실패했습니다.')
        return
      }

      // 성공: 생성된 상품 상세 페이지로 이동 (반환값에 id 포함 가정)
      nav(`/products/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-max py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">상품 등록</h1>

      {/* 폼 (Mendix: DataView + Save 마이크로플로우) */}
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="상품명"
          value={name}
          onChange={e=>setName(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="가격"
          type="number"
          value={price}
          onChange={e=>setPrice(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="배지(선택: NEW/BEST 등)"
          value={badge}
          onChange={e=>setBadge(e.target.value)}
        />
        <textarea
          className="w-full border rounded px-3 py-2 min-h-[120px]"
          placeholder="상세 설명(선택)"
          value={desc}
          onChange={e=>setDesc(e.target.value)}
        />

        {/* 파일 업로드 (Mendix: File Manager 위젯과 유사, 다중 선택) */}
        <div>
          <label className="block text-sm mb-1">이미지(여러 장 선택 가능)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={e=>setImages(e.target.files)}
          />
        </div>

        {/* 검증/서버 에러 메시지 */}
        {err && <div className="text-red-600 text-sm">{err}</div>}

        {/* 액션 버튼들 */}
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
            {saving ? '등록 중…' : '등록'}
          </button>
          <button type="button" className="px-4 py-2 rounded border" onClick={()=>nav(-1)}>
            취소
          </button>
        </div>
      </form>
    </div>
  )
}

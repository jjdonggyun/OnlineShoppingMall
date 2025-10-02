// components/Nav.tsx
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../stores/auth'
import { useCartSmart } from '../stores/useCartSmart'

export default function Nav() {
  const { user, clear } = useAuth()
  const cart = useCartSmart()
  const count = cart.isLoggedIn
    ? (cart.data?.totalQty ?? 0)
    : cart.guestItems.reduce((s, it) => s + it.qty, 0)

  const [open, setOpen] = useState(false)
  const loc = useLocation()

  // 라우트가 바뀌면 모바일 메뉴 닫기
  useEffect(() => { setOpen(false) }, [loc.pathname])

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    clear()
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="container-max flex items-center justify-between h-14">
        {/* 로고 */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-brand">ATTRI</span><span className="text-brand-accent">LOOK</span>
        </Link>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-black">NEW</a>
          <a href="#" className="hover:text-black">BEST</a>
          <a href="#" className="hover:text-black">DRESS</a>
          <a href="#" className="hover:text-black">ACC</a>
        </nav>

        {/* 우측 유틸(데스크톱) */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user?.role === 'ADMIN' && (
            <>
              <Link
                to="/admin/products/new"
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                상품 등록
              </Link>
              <Link
                to="/admin/products/soldout"
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                품절 상품
              </Link>
              <Link 
                to="/admin/banners" 
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
                배너 관리
              </Link>
            </>
          )}

          {user ? (
            <>
              <span>{user.email} {user.role === 'ADMIN' && '(Admin)'}</span>
              <Link to="/me" className="hover:underline">내 정보</Link>
              <button onClick={logout} className="hover:underline">로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">로그인</Link>
              <Link to="/register" className="font-medium hover:underline">회원가입</Link>
            </>
          )}

          <Link to="/cart" className="relative px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            장바구니
            {count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-5 h-5">
                {count}
              </span>
            )}
          </Link>
        </div>

        {/* 모바일: 햄버거 버튼 */}
        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border hover:bg-gray-50"
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          {/* 햄버거 아이콘 */}
          <span className="block w-5 h-[2px] bg-black relative">
            <span className="absolute left-0 -top-2 block w-5 h-[2px] bg-black" />
            <span className="absolute left-0 top-2 block w-5 h-[2px] bg-black" />
          </span>
        </button>
      </div>

      {/* 모바일 오버레이 + 드로어 */}
      {/* 배경 오버레이 */}
<div
  className={`md:hidden fixed inset-0 z-[9998] transition
              ${open ? 'bg-black/40 pointer-events-auto' : 'pointer-events-none bg-transparent'}`}
  onClick={() => setOpen(false)}
  aria-hidden="true"
/>

      {/* 드로어 패널 */}
<aside
  id="mobile-menu"
  className={`md:hidden fixed top-0 right-0 bottom-0 z-[9999] w-[100%] max-w-[100%]
              bg-white border-l shadow-2xl transition-transform duration-300
              ${open ? 'translate-x-0' : 'translate-x-full'}`}
  role="dialog"
  aria-modal="true"
  // ★ 드로어 내부 클릭은 닫힘 방지
  onClick={(e) => e.stopPropagation()}
>
        <div className="h-14 px-4 flex items-center justify-between border-b">
          <span className="text-lg font-semibold">메뉴</span>
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border hover:bg-gray-50"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          >
            {/* 닫기 아이콘 (X) */}
            <span className="relative block w-5 h-5">
              <span className="absolute inset-0 bg-black rotate-45 h-[2px] top-1/2" />
              <span className="absolute inset-0 bg-black -rotate-45 h-[2px] top-1/2" />
            </span>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="p-4 overflow-y-auto bg-white h-screen">
          {/* 상단 링크들 */}
          <nav className="flex flex-col gap-3 text-[15px]">
            <Link to="/" className="py-2 px-2 rounded hover:bg-gray-50">홈</Link>
            <a href="#" className="py-2 px-2 rounded hover:bg-gray-50">NEW</a>
            <a href="#" className="py-2 px-2 rounded hover:bg-gray-50">BEST</a>
            <a href="#" className="py-2 px-2 rounded hover:bg-gray-50">DRESS</a>
            <a href="#" className="py-2 px-2 rounded hover:bg-gray-50">ACC</a>
          </nav>

          <hr className="my-4" />

          {/* 장바구니 */}
          <Link
            to="/cart"
            className="flex items-center justify-between py-2 px-2 rounded border hover:bg-gray-50"
          >
            <span>장바구니</span>
            {count > 0 && (
              <span className="inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-6 h-6">
                {count}
              </span>
            )}
          </Link>

          <hr className="my-4" />

          {/* 인증/관리자 영역 */}
          <div className="flex flex-col gap-2">
            {user ? (
              <>
                <div className="text-sm text-gray-700 px-2">{user.email} {user.role === 'ADMIN' && '(Admin)'}</div>
                <Link to="/me" className="py-2 px-2 rounded border hover:bg-gray-50">내 정보</Link>
                <button onClick={logout} className="py-2 px-2 rounded border hover:bg-gray-50 text-left">로그아웃</button>

                {user.role === 'ADMIN' && (
                  <>
                    <Link to="/admin/products/new" className="py-2 px-2 rounded border hover:bg-gray-50">상품 등록</Link>
                    <Link to="/admin/products/soldout" className="py-2 px-2 rounded border hover:bg-gray-50">품절 상품</Link>
                    <Link to="/admin/banners" className="py-2 px-2 rounded border hover:bg-gray-50">배너 관리</Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="py-2 px-2 rounded border hover:bg-gray-50">로그인</Link>
                <Link to="/register" className="py-2 px-2 rounded border hover:bg-gray-50">회원가입</Link>
              </>
            )}
          </div>

          <div className="mt-6 text-xs text-gray-500 px-2">© 2025 Sample Mall</div>
        </div>
      </aside>
      {/* 모바일 끝 */}
    </header>
  )
}

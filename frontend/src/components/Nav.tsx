// src/components/Nav.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../stores/auth'
import { useCartSmart } from '../stores/useCartSmart'
import { useWishlist } from '../stores/useWishlist'
import { useQueryClient } from '@tanstack/react-query'

type PubHash = {
  id: string
  label: string
  emoji?: string | null
  type: 'MENU' | 'CATEGORY' | 'TAG' | 'CHANNEL'
  value: string
  order?: number
}

async function fetchPublic(type?: PubHash['type']) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  const r = await fetch(`/api/hashtags${qs}`)
  if (!r.ok) return [] as PubHash[]
  return r.json() as Promise<PubHash[]>
}

export default function Nav() {
  const { user, clear } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const cart = useCartSmart()

  const count = cart.isLoggedIn
    ? (cart.data?.totalQty ?? 0)
    : cart.guestItems.reduce((s, it) => s + it.qty, 0)

  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const wl = useWishlist()

  useEffect(() => { setOpen(false) }, [loc.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    clear()
    // ✅ 유저 종속 쿼리들 제거(잔상 방지)
    qc.removeQueries({ queryKey: ['wishlist'] })
    qc.removeQueries({ queryKey: ['cart'] })
    qc.removeQueries({ queryKey: ['me'] })
    // 필요하면 홈으로 이동:
    // nav('/')
  }

  // ─────────────── 해시태그: MENU(내비 메뉴) & CHANNEL(채널) 동적 로드
  const [menus, setMenus] = useState<PubHash[]>([])
  const [channels, setChannels] = useState<PubHash[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([fetchPublic('MENU'), fetchPublic('CHANNEL')]).then(([menuList, channelList]) => {
      if (!alive) return
      const sort = (a: PubHash, b: PubHash) => (a.order ?? 0) - (b.order ?? 0)
      setMenus(menuList.slice().sort(sort))
      setChannels(channelList.slice().sort(sort))
    })
    return () => { alive = false }
  }, [])

  const desktopMenu = useMemo(() => menus, [menus])
  const desktopChannels = useMemo(() => channels, [channels])

  // ✅ 공통: 찜 버튼 클릭 핸들러 (비로그인 ⇒ 로그인으로 유도)
  function goWishlist() {
    if (!user) nav('/login?next=/wishlist')
    else nav('/wishlist')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="flex items-center justify-between h-14 px-5">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-brand">SUNYA</span><span className="text-brand-accent">LOOK</span>
        </Link>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          {/* 채널 섹션 (예: NEW, BEST) */}
          {desktopChannels.map(c => (
            <Link
              key={c.id}
              to={`/products?channel=${encodeURIComponent(c.value)}`}
              className="hover:text-black"
            >
              {c.label}
            </Link>
          ))}
          {/* 구분선 */}
          {desktopChannels.length > 0 && <span className="w-px h-4 bg-gray-200" />}

          {/* 메뉴 섹션 (카테고리 링크) */}
          {desktopMenu.map(m => (
            <Link
              key={m.id}
              to={`/products?category=${encodeURIComponent(m.value)}`}
              className="hover:text-black"
            >
              {m.label}
            </Link>
          ))}
        </nav>

        {/* 우측 유틸(데스크톱) */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin/products" className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">관리자 페이지</Link>
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

          {/* ✅ 찜: 비로그인 시 로그인으로 */}
          <button
            type="button"
            onClick={goWishlist}
            className="relative px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            찜
            {(user && wl.ids.length > 0) && (
              <span className="ml-2 inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-5 h-5">
                {wl.ids.length}
              </span>
            )}
          </button>

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
          <span className="block w-5 h-[2px] bg-black relative">
            <span className="absolute left-0 -top-2 block w-5 h-[2px] bg-black" />
            <span className="absolute left-0 top-2 block w-5 h-[2px] bg-black" />
          </span>
        </button>
      </div>

      {/* 모바일 오버레이 */}
      <div
        className={`md:hidden fixed inset-0 z-[9998] transition
              ${open ? 'bg-black/40 pointer-events-auto' : 'pointer-events-none bg-transparent'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      {/* 드로어 */}
      <aside
        id="mobile-menu"
        className={`md:hidden fixed top-0 right-0 bottom-0 z-[9999] w-[100%] max-w-[100%]
              bg-white border-l shadow-2xl transition-transform duration-300
              ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b">
          <span className="text-lg font-semibold">메뉴</span>
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border hover:bg-gray-50"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          >
            <span className="relative block w-5 h-5">
              <span className="absolute inset-0 bg-black rotate-45 h-[2px] top-1/2" />
              <span className="absolute inset-0 bg-black -rotate-45 h-[2px] top-1/2" />
            </span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto bg-white h-screen">
          <nav className="flex flex-col gap-3 text-[15px]">
            <Link to="/" className="py-2 px-2 rounded hover:bg-gray-50">홈</Link>

            {/* 채널 그룹 */}
            {desktopChannels.length > 0 && (
              <>
                <div className="mt-2 mb-1 text-xs font-semibold text-gray-500 px-2">채널</div>
                {desktopChannels.map(c => (
                  <Link
                    key={c.id}
                    to={`/products?channel=${encodeURIComponent(c.value)}`}
                    className="py-2 px-2 rounded hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    {c.label}
                  </Link>
                ))}
                <hr className="my-3" />
              </>
            )}

            {/* 메뉴(카테고리) 그룹 */}
            <div className="mt-1 mb-1 text-xs font-semibold text-gray-500 px-2">카테고리</div>
            {desktopMenu.map(m => (
              <Link
                key={m.id}
                to={`/products?category=${encodeURIComponent(m.value)}`}
                className="py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <hr className="my-4" />

          {/* ✅ 모바일에서도 버튼으로 처리 */}
          <button
            type="button"
            onClick={() => { setOpen(false); goWishlist() }}
            className="relative px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            찜
            {(user && wl.ids.length > 0) && (
              <span className="ml-2 inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-5 h-5">
                {wl.ids.length}
              </span>
            )}
          </button>

          <hr className="my-4" />

          <Link
            to="/cart"
            className="flex items-center justify-between py-2 px-2 rounded border hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>장바구니</span>
            {count > 0 && (
              <span className="inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-6 h-6">
                {count}
              </span>
            )}
          </Link>

          <hr className="my-4" />

          <div className="flex flex-col gap-2">
            {user ? (
              <>
                <div className="text-sm text-gray-700 px-2">
                  {user.email} {user.role === 'ADMIN' && '(Admin)'}
                </div>
                <Link to="/me" className="py-2 px-2 rounded border hover:bg-gray-50" onClick={() => setOpen(false)}>
                  내 정보
                </Link>
                <button
                  onClick={() => { setOpen(false); logout() }}
                  className="py-2 px-2 rounded border hover:bg-gray-50 text-left"
                >
                  로그아웃
                </button>
                {user.role === 'ADMIN' && (
                  <>
                    <Link to="/admin/products" className="py-2 px-2 rounded border hover:bg-gray-50" onClick={() => setOpen(false)}>
                      관리자 페이지
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="py-2 px-2 rounded border hover:bg-gray-50" onClick={() => setOpen(false)}>
                  로그인
                </Link>
                <Link to="/register" className="py-2 px-2 rounded border hover:bg-gray-50" onClick={() => setOpen(false)}>
                  회원가입
                </Link>
              </>
            )}
          </div>

          <div className="mt-6 text-xs text-gray-500 px-2">© 2025 Sample Mall</div>
        </div>
      </aside>
    </header>
  )
}

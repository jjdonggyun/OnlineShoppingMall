import { Link } from 'react-router-dom'      // 페이지 이동을 위한 Link (Mendix의 Navigation Action과 유사)
import { useAuth } from '../stores/auth'     // 로그인 상태 관리 (Mendix의 Session 객체와 비슷)
import { useCart } from '../stores/useCart'
import { useCartSmart } from '../stores/useCartSmart'

export default function Nav() {
  const { user, clear } = useAuth()          // user: 로그인된 사용자 정보 / clear: 로그아웃 시 세션 초기화 함수
  const cart = useCartSmart()
  const count = cart.isLoggedIn
    ? (cart.data?.totalQty ?? 0)
    : cart.guestItems.reduce((s, it) => s + it.qty, 0)

  // 로그아웃 함수
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    // 서버에 로그아웃 요청 (Mendix의 "Call REST" 액션과 유사)
    clear() // 프론트엔드 상태에서 사용자 정보 삭제
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      {/* 최상단 고정 네비게이션 바 (Mendix의 Layout Header 같은 역할) */}
      <div className="container-max flex items-center justify-between h-14">

        {/* 로고 영역 */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-brand">ATTRI</span>
          <span className="text-brand-accent">LOOK</span>
        </Link>

        {/* 메뉴 영역 (Mendix에서 버튼/네비게이션 바와 유사) */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-black">NEW</a>
          <a href="#" className="hover:text-black">BEST</a>
          <a href="#" className="hover:text-black">DRESS</a>
          <a href="#" className="hover:text-black">ACC</a>
        </nav>

        {/* 사용자 영역 */}
        <div className="flex items-center gap-4 text-sm">

          {user?.role === 'ADMIN' && (
            <>
              <Link
                to="/admin/products/new"
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                상품 등록
              </Link>
              {/* ★ 추가: 품절 상품 페이지 */}
              <Link
                to="/admin/products/soldout"
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                품절 상품
              </Link>
            </>
          )}

          {/* 로그인 여부에 따라 다르게 표시 */}
          {user ? (
            <>
              {/* 로그인 상태: 이메일 표시 + 로그아웃 버튼 */}
              <span>{user.email} {user.role === 'ADMIN' && '(Admin)'}</span>
              <button onClick={logout}>로그아웃</button>
            </>
          ) : (
            <>
              {/* 비로그인 상태: 로그인 / 회원가입 버튼 */}
              <Link to="/login">로그인</Link>
              <Link to="/register" className="font-medium">회원가입</Link>
            </>
          )}

          {/* 장바구니 버튼 */}
          <Link to="/cart" className="relative px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            장바구니
            {count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-xs rounded-full bg-black text-white w-5 h-5">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

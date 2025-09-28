import { Link } from 'react-router-dom'
import { useAuth } from '../stores/auth'

export default function Nav() {
  const { user, clear } = useAuth()
  async function logout(){
    await fetch('/api/auth/logout', { method:'POST', credentials:'include' })
    clear()
  }
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="container-max flex items-center justify-between h-14">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-brand">ATTRI</span><span className="text-brand-accent">LOOK</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-black">NEW</a>
          <a href="#" className="hover:text-black">BEST</a>
          <a href="#" className="hover:text-black">DRESS</a>
          <a href="#" className="hover:text-black">ACC</a>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span>{user.email} {user.role==='ADMIN' && '(Admin)'}</span>
              <button onClick={logout}>로그아웃</button>
            </>
          ) : (
            <>
            <Link to="/login">로그인</Link>
            <Link to="/register" className="font-medium">회원가입</Link> {/* ← 추가 */}
            </>
          )}
          <button>장바구니</button>
        </div>
      </div>
    </header>
  )
}

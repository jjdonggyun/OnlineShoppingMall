// src/components/WishButton.tsx
import { useWishlist } from '../stores/useWishlist'
import { useAuth } from '../stores/auth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function WishButton({
  productId,
  size = 28,
  className = '',
}: { productId: string; size?: number; className?: string }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const wl = useWishlist()

  const active = wl.isWished(productId)
  const disabled = wl.isLoading // ✅ 로딩 중에는 누르기만 막음

  async function toggle() {
    if (!user) {
      nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`)
      return
    }
    if (active) await wl.remove(productId)
    else await wl.add(productId)
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) void toggle() }}
      aria-label={active ? '찜 해제' : '찜하기'}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full border px-2 py-2 ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={active ? '찜 해제' : '찜하기'}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}

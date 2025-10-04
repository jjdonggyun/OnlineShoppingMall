// src/components/Hero.tsx
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

type Banner = { id: string; title?: string; image: string; link?: string }

function useMediaQuery(q: string) {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' ? window.matchMedia(q).matches : false)
  useEffect(() => {
    const m = window.matchMedia(q)
    const h = (e: MediaQueryListEvent) => setOk(e.matches)
    setOk(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [q])
  return ok
}

/** 모바일 100vh 버그 대응: --vh CSS 변수에 실제 viewport height(1%) 저장 */
function useMobileVhVar(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return

    // 100dvh 지원 여부 체크
    const supportsDVH = CSS && CSS.supports && CSS.supports('height', '100dvh')
    if (supportsDVH) return // 폴백 불필요

    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVh()
    window.addEventListener('resize', setVh)
    window.addEventListener('orientationchange', setVh)
    return () => {
      window.removeEventListener('resize', setVh)
      window.removeEventListener('orientationchange', setVh)
    }
  }, [active])
}


export default function Hero() {
  // Tailwind md(768px) 기준: md 이상이면 WEB, 미만이면 MOBILE
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const device = isDesktop ? 'web' : 'mobile'

  // 모바일 전체화면 높이를 정확히 쓰기 위해 --vh 세팅
  useMobileVhVar(!isDesktop)

  const { data } = useQuery<Banner[]>({
    queryKey: ['banners', device],
    queryFn: async () => {
      const r = await fetch(`/api/banners?device=${device}`)
      if (!r.ok) throw new Error('BANNERS')
      return r.json()
    }
  })

  const list = data ?? []
  if (!list.length) return null

  // 공통: 풀블리드/컨테이너 클래스 결정
  const wrapperClass = isDesktop ? '' : 'full-bleed mt-0'

  // 데스크톱은 기존 비율, 모바일은 실제 화면 높이로 꽉 채움
  const desktopBoxClass = 'aspect-[16/6] max-h-[480px] min-h-[180px]'
  const mobileBoxClass = 'mobile-vh w-screen' // ← 여기!

  // 모바일 전용 높이 스타일
  const mobileFullHeightStyle = !isDesktop ? { height: 'calc(var(--vh, 1vh) * 80)' } : undefined

  // 1장: 슬라이더 없이 단일 배너만
  if (list.length === 1) {
    const b = list[0]
    const Img = (
      <img
        src={b.image}
        alt={b.title || 'banner'}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    )
    return (
      <div className={wrapperClass}>
        <div
          className={`relative overflow-hidden w-full ${isDesktop ? desktopBoxClass : mobileBoxClass}`}
          style={mobileFullHeightStyle}
        >
          {b.link ? <a href={b.link} className="block h-full">{Img}</a> : Img}
          {b.title && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="text-white text-base md:text-lg font-semibold drop-shadow">{b.title}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 여러 장: 분리된 슬라이더 컴포넌트
  return (
    <div className={wrapperClass}>
      <BannerSlider list={list} isDesktop={isDesktop} mobileFullHeightStyle={mobileFullHeightStyle} />
    </div>
  )
}

function BannerSlider({
  list,
  isDesktop,
  mobileFullHeightStyle
}: {
  list: Banner[]
  isDesktop: boolean
  mobileFullHeightStyle?: React.CSSProperties
}) {
  const AUTOPLAY_MS = 4000
  const TRANSITION_MS = 350

  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const sliding = useRef(false)

  const go = (n: number) => {
    if (sliding.current) return
    sliding.current = true
    setIdx(i => (n + list.length) % list.length)
    setTimeout(() => (sliding.current = false), TRANSITION_MS + 20)
  }
  const next = () => go(idx + 1)
  const prev = () => go(idx - 1)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused, list.length])

  const desktopBoxClass = 'aspect-[16/6] max-h-[480px] min-h-[180px]'
  const mobileBoxClass = 'w-screen'

  return (
    <div
      className={`relative overflow-hidden rounded-none w-full ${isDesktop ? desktopBoxClass : mobileBoxClass}`}
      style={isDesktop ? undefined : mobileFullHeightStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="프로모션 배너 슬라이더"
      tabIndex={0}
    >
      {/* 트랙 */}
      <div
        className="flex h-full"
        style={{ transform: `translateX(-${idx * 100}%)`, transition: `transform ${TRANSITION_MS}ms ease-in-out` }}
      >
        {list.map((b) => {
          const Img = (
            <img
              src={b.image}
              alt={b.title || 'banner'}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )
          return (
            <div key={b.id} className="relative flex-none w-full h-full">
              {b.link ? <a href={b.link} className="block h-full">{Img}</a> : Img}
              {b.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="text-white text-base md:text-lg font-semibold drop-shadow">{b.title}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 좌우 버튼 */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white px-3 py-2 text-sm"
        aria-label="이전 배너"
      >‹</button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white px-3 py-2 text-sm"
        aria-label="다음 배너"
      >›</button>

      {/* 인디케이터 */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex gap-2">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`h-2.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'}`}
            aria-label={`${i + 1}번째 배너로 이동`}
          />
        ))}
      </div>
    </div>
  )
}

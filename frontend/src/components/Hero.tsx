// src/components/Hero.tsx
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

type Banner = { id: string; title?: string; image: string; link?: string }

export default function Hero() {
  const { data } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: async () => {
      const r = await fetch('/api/banners')
      if (!r.ok) throw new Error('BANNERS')
      return r.json()
    }
  })

  const list = data ?? []
  if (!list.length) return null

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
      <div className="container-max mt-4">
        <div className="relative overflow-hidden rounded-2xl aspect-[16/6] max-h-[420px] min-h-[180px]">
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

  // 여러 장: 분리된 슬라이더 컴포넌트 사용 (훅은 자식 안으로)
  return (
    <div className="container-max mt-4">
      <BannerSlider list={list} />
    </div>
  )
}

function BannerSlider({ list }: { list: Banner[] }) {
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl aspect-[16/8] max-h-[420px] min-h-[180px]"
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

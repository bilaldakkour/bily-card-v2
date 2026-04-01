'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HomeBanner } from '@/features/home/banner.types'

type BilyHeroSliderProps = {
  banners: HomeBanner[]
  autoRotateMs?: number
}

export default function BilyHeroSlider({
  banners,
  autoRotateMs = 4500,
}: BilyHeroSliderProps) {
  const items = useMemo(
    () =>
      banners
        .filter((banner) => banner.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    if (items.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % items.length)
    }, autoRotateMs)

    return () => window.clearInterval(timer)
  }, [autoRotateMs, items.length])

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, items.length])

  if (items.length === 0) return null

  const next = () => setActiveIndex((previous) => (previous + 1) % items.length)
  const previous = () =>
    setActiveIndex((current) => (current - 1 + items.length) % items.length)

  return (
    <section className='mt-1.5 sm:mt-2.5'>
      <div
        className='relative overflow-hidden rounded-3xl border border-violet-300/30 bg-[#0c1220]/95 shadow-[0_24px_55px_rgba(2,6,23,0.62),0_0_32px_rgba(139,92,246,0.22)]'
        onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX === null) return
          const endX = event.changedTouches[0]?.clientX ?? touchStartX
          const delta = touchStartX - endX
          if (Math.abs(delta) > 40) {
            if (delta > 0) next()
            else previous()
          }
          setTouchStartX(null)
        }}
      >
        <div className='pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10' />
        <div className='pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent' />
        <div className='pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-violet-500/18 blur-3xl' />
        <div className='pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-cyan-400/18 blur-3xl' />
        <div className='pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.07)_50%,transparent_80%)] opacity-20' />

        <div
          className='flex transition-transform duration-500 ease-out'
          style={{ transform: `translateX(${activeIndex * -100}%)` }}
        >
          {items.map((banner, index) => (
            <article key={banner.id} className='group relative isolate h-32 min-w-full overflow-hidden sm:h-48 lg:h-56'>
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className={`z-0 object-cover transition duration-1000 ease-out ${
                  activeIndex === index ? 'scale-[1.05]' : 'scale-100'
                }`}
                priority={index === 0}
                sizes='(max-width: 640px) 100vw, (max-width: 1200px) 85vw, 1100px'
              />
              <div className='absolute inset-0 z-10 bg-gradient-to-l from-[#050916]/95 via-[#050916]/60 to-[#050916]/18' />
              <div className='absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-transparent to-black/25' />
              <div className='absolute inset-0 z-10 bg-[radial-gradient(circle_at_24%_18%,rgba(139,92,246,0.28),transparent_45%)]' />
              <div className='absolute inset-0 z-10 bg-[radial-gradient(circle_at_80%_25%,rgba(34,211,238,0.16),transparent_40%)]' />

              <div className='absolute inset-0 z-20 flex items-end justify-between gap-3 p-4 sm:p-5 lg:p-5' dir='rtl'>
                <div className='relative z-20 min-w-0 max-w-[80%] text-right transition-all duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.005]'>
                  {banner.badge ? (
                    <span className='mb-2 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.22)] backdrop-blur-sm sm:text-[11px]'>
                      {banner.badge}
                    </span>
                  ) : null}
                  <h3 className='truncate text-base font-black tracking-[0.01em] text-white/95 sm:text-lg'>
                    {banner.title}
                  </h3>
                  <p className='mt-1.5 line-clamp-2 text-[11px] text-slate-100/88 sm:text-xs'>
                    {banner.subtitle}
                  </p>
                </div>

                {banner.linkUrl ? (
                  <Link
                    href={banner.linkUrl}
                    className='shrink-0 rounded-xl border border-violet-300/40 bg-violet-500/16 px-3 py-1.5 text-[11px] font-semibold text-violet-100 shadow-[0_0_14px_rgba(139,92,246,0.22)] transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-violet-500/24 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] sm:text-xs'
                  >
                    {'\u062a\u0633\u0648\u0642 \u0627\u0644\u0622\u0646'}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {items.length > 1 ? (
          <>
            <button
              type='button'
              onClick={previous}
              className='absolute left-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white/70 backdrop-blur-sm transition duration-300 hover:scale-[1.03] hover:bg-black/30 hover:text-white/90'
              aria-label={'\u0627\u0644\u0633\u0627\u0628\u0642'}
            >
              <ChevronLeft className='h-4 w-4' />
            </button>
            <button
              type='button'
              onClick={next}
              className='absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white/70 backdrop-blur-sm transition duration-300 hover:scale-[1.03] hover:bg-black/30 hover:text-white/90'
              aria-label={'\u0627\u0644\u062a\u0627\u0644\u064a'}
            >
              <ChevronRight className='h-4 w-4' />
            </button>

            <div className='absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur'>
              {items.map((banner, index) => (
                <button
                  key={banner.id}
                  type='button'
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    activeIndex === index
                      ? 'w-6 bg-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.85)]'
                      : 'w-1.5 bg-white/35 hover:bg-white/60'
                  }`}
                  aria-label={`banner-${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

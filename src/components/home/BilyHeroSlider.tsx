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
        .filter((banner) => banner.isActive && typeof banner.imageUrl === 'string' && banner.imageUrl.trim().length > 0)
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
    <section className='featured-slider-section' dir='rtl'>
      <div
        className='featured-slider-shell'
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
        <div className='featured-slider-shell-bg' />
        <div className='featured-slider-shell-grid' />

        <div
          className='featured-slider-track'
          style={{ transform: `translateX(${activeIndex * -100}%)` }}
        >
          {items.map((banner, index) => (
            <article key={banner.id} className='featured-slider-slide' dir='rtl'>
              <div className='featured-slider-stage'>
                <div className='featured-slider-stage-glow featured-slider-stage-glow-cyan' />
                <div className='featured-slider-stage-glow featured-slider-stage-glow-pink' />
                <div className='featured-slider-stage-glow featured-slider-stage-glow-violet' />
                <div className='featured-slider-backdrop' />

                <div className='featured-slider-banner'>
                  <div className='featured-slider-media'>
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      className={`featured-slider-card-image ${
                        activeIndex === index ? 'scale-[1.03]' : 'scale-100'
                      }`}
                      priority={index === 0}
                      sizes='(max-width: 768px) 100vw, 72vw'
                    />
                    <div className='featured-slider-card-image-overlay' />
                    <div className='featured-slider-spotlight' />
                  </div>

                  <div className='featured-banner-layout'>
                    <div className='featured-banner-copy'>
                      <span className='featured-slider-kicker'>
                        {banner.badge || '\u0628\u064a\u0644\u064a \u0643\u0627\u0631\u062f \u0628\u0631\u064a\u0645\u064a\u0648\u0645'}
                      </span>
                      <h2 className='featured-slider-title'>{banner.title}</h2>
                      <p className='featured-slider-subtitle'>{banner.subtitle}</p>

                      <div className='featured-banner-actions'>
                        {banner.linkUrl ? (
                          <Link href={banner.linkUrl} className='featured-slider-card-cta'>
                            {'\u062a\u0635\u0641\u062d \u0627\u0644\u0639\u0631\u0648\u0636'}
                          </Link>
                        ) : null}
                        <span className='featured-banner-ghost'>
                          {'\u0639\u0631\u0648\u0636 \u062a\u0646\u0627\u0641\u0633\u064a\u0629'}
                        </span>
                      </div>
                    </div>

                    <div className='featured-banner-visual'>
                      <div className='featured-slider-mini-brand'>
                        <span className='featured-slider-mini-brand-badge'>
                          {'\u2728 Bily Card'}
                        </span>
                        <span className='featured-slider-mini-brand-copy'>
                          {'\u0627\u0644\u0645\u062a\u062c\u0631 \u0627\u0644\u0631\u0642\u0645\u064a'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {items.length > 1 ? (
          <>
            <button
              type='button'
              onClick={previous}
              className='featured-slider-arrow featured-slider-arrow-left'
              aria-label={'\u0627\u0644\u0633\u0627\u0628\u0642'}
            >
              <ChevronLeft className='h-4 w-4' />
            </button>
            <button
              type='button'
              onClick={next}
              className='featured-slider-arrow featured-slider-arrow-right'
              aria-label={'\u0627\u0644\u062a\u0627\u0644\u064a'}
            >
              <ChevronRight className='h-4 w-4' />
            </button>

            <div className='featured-slider-dots'>
              {items.map((banner, index) => (
                <button
                  key={banner.id}
                  type='button'
                  onClick={() => setActiveIndex(index)}
                  className={`featured-slider-dot ${
                    activeIndex === index
                      ? 'featured-slider-dot-active'
                      : 'featured-slider-dot-idle'
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

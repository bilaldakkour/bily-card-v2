'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import BilyHeroSlider from '@/components/home/BilyHeroSlider'
import type { HomeBanner } from '@/features/home/banner.types'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BilySupportActions } from '@/components/layout/BilySupportActions'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'
import { searchSuggestionItems } from '@/modules/search/utils'

type SearchItem = {
  id: string
  label: string
  kind: string
  href: string
  thumbnail?: string | null
}

type BilyTopHeaderProps = {
  searchItems: SearchItem[]
  walletBalance?: string
  banners: HomeBanner[]
}

export default function BilyTopHeader({ searchItems, banners }: BilyTopHeaderProps) {
  const pathname = usePathname()
  const { t, direction } = useLocale()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isMobileProductPage = pathname.startsWith('/products/')
  const textAlign = direction === 'rtl' ? 'text-right' : 'text-left'
  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    return searchSuggestionItems(searchItems, deferredQuery, 8)
  }, [deferredQuery, searchItems])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div className={isMobileProductPage ? 'hidden lg:block' : ''}>
      <div className='theme-header-bar sticky top-0 z-[80] border-b lg:static lg:z-auto lg:border-b-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-0'>
        <div className='mx-auto max-w-[1600px] px-3 py-3 sm:px-4 lg:px-6 xl:mx-0 xl:max-w-none'>
          <div className='flex items-center gap-2.5 sm:gap-3' dir={direction}>
            <Link
              href='/'
              className='theme-icon-button inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[11px] font-semibold text-violet-100 transition duration-200 ease-out'
              aria-label='Bily Card'
            >
              BC
            </Link>

            <div ref={rootRef} className='relative min-w-0 flex-1' dir={direction}>
              <form action='/search'>
                <label className='sr-only' htmlFor='bily-search-input'>
                  {t('search_label')}
                </label>
                <div className='header-search-wrap flex h-11 items-center gap-2 rounded-2xl px-3'>
                  <Search className='h-4 w-4 shrink-0 text-slate-400' />
                  <input
                    id='bily-search-input'
                    name='q'
                    type='search'
                    value={query}
                    onChange={(event) => {
                      const next = event.target.value
                      setQuery(next)
                      setOpen(next.trim().length > 0)
                    }}
                    onFocus={() => setOpen(query.trim().length > 0)}
                    placeholder={t('search_placeholder')}
                    className={`h-full w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 ${textAlign}`}
                  />
                </div>
              </form>

              {open ? (
                <div className='panel-soft-surface absolute right-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl'>
                  <div className='max-h-72 overflow-y-auto p-2'>
                    {filtered.length > 0 ? (
                      filtered.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className='flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition duration-150 hover:border-violet-300/30 hover:bg-violet-500/10'
                        >
                          <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5'>
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.label} className='h-full w-full object-cover' />
                            ) : (
                              <Search className='h-4 w-4 text-slate-400' />
                            )}
                          </span>
                          <span className={`min-w-0 flex-1 ${textAlign}`}>
                            <span className='block truncate text-sm font-semibold text-slate-100'>{item.label}</span>
                            <span className='mt-0.5 block text-[11px] text-violet-200/85'>{item.kind}</span>
                          </span>
                        </Link>
                      ))
                    ) : (
                      <div className={`px-2.5 py-3 text-xs text-slate-400 ${textAlign}`}>{t('search_empty')}</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className='hidden items-center gap-2 lg:flex'>
              <LanguageSwitcher compact />
              <ThemeToggle compact />
              <BilySupportActions compact />
            </div>
          </div>

          <div className='mt-2 hidden lg:flex lg:justify-end'>
            <div className={`text-xs text-slate-400 ${textAlign}`}>{t('support_quick_note')}</div>
          </div>
        </div>
      </div>
      <header className='relative z-0'>
        <div className='mx-auto max-w-[1600px] px-3 pb-2 pt-1.5 sm:px-4 sm:py-3 lg:px-6 xl:mx-0 xl:max-w-none'>
          <BilyHeroSlider banners={banners} />
        </div>
      </header>
    </div>
  )
}

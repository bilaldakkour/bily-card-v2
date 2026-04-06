'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { Bell, Menu, Search, UserRound, Wallet } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
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
}

export default function BilyTopHeader({
  searchItems,
  walletBalance = '$0.00',
}: BilyTopHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, direction } = useLocale()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const isMobileProductPage = pathname.startsWith('/products/')

  const suggestions = useMemo(
    () => searchSuggestionItems(searchItems, deferredQuery, 7),
    [deferredQuery, searchItems]
  )

  function submitSearch() {
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className={isMobileProductPage ? 'hidden lg:block' : ''} dir={direction}>
      <div className='sticky-search-row sticky top-0 z-[90]'>
        <div className='storefront-topbar-wrap mx-auto max-w-[1600px] px-3 pb-2 pt-3 sm:px-4 lg:px-6'>
          <section className='storefront-topbar dailycard-topbar'>
            <div className='dailycard-topbar-row'>
              <div className='dailycard-topbar-brand'>
                <Link href='/' className='dailycard-brand-lockup' aria-label='Bily Card'>
                  <span className='dailycard-brand-mark'>
                    <Image
                      src='/bily-logo-icon.ico'
                      alt='Bily Card logo'
                      fill
                      sizes='52px'
                      className='object-contain p-1'
                      unoptimized
                    />
                  </span>

                  <span className='dailycard-brand-copy'>
                    <span className='dailycard-brand-kicker'>Bily Card</span>
                    <span className='dailycard-brand-title'>Abou Joury store</span>
                  </span>
                </Link>

                <button
                  type='button'
                  className='dailycard-menu-button'
                  aria-label={'\u0627\u0644\u0642\u0627\u0626\u0645\u0629'}
                >
                  <Menu className='h-5 w-5' />
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitSearch()
                }}
                className='storefront-search-form dailycard-search-form'
              >
                <div className='storefront-search-shell dailycard-search-shell'>
                  <button
                    type='submit'
                    className='storefront-search-button dailycard-search-button'
                    aria-label={t('search_label')}
                  >
                    <Search className='h-4 w-4' />
                  </button>

                  <div className='min-w-0 flex-1 text-right'>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={'\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c \u2026'}
                      className='search-input-shell storefront-search-input'
                    />
                  </div>
                </div>

                {query.trim() ? (
                  <div className='storefront-search-dropdown panel-soft-surface'>
                    {suggestions.length > 0 ? (
                      <div className='grid gap-1.5'>
                        {suggestions.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            className='subtle-hover-surface flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition'
                          >
                            <span className='relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/14 bg-white/[0.04]'>
                              {item.thumbnail ? (
                                <Image
                                  src={item.thumbnail}
                                  alt={item.label}
                                  fill
                                  sizes='44px'
                                  className='object-cover'
                                />
                              ) : (
                                <Search className='h-4 w-4 text-cyan-200' />
                              )}
                            </span>
                            <div className='min-w-0 flex-1 text-right'>
                              <div className='truncate text-sm font-semibold text-white'>
                                {item.label}
                              </div>
                              <div className='truncate text-xs text-slate-400'>{item.kind}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className='list-empty-shell rounded-2xl px-4 py-4 text-center text-sm text-slate-300'>
                        {t('search_empty')}
                      </div>
                    )}
                  </div>
                ) : null}
              </form>

              <div className='dailycard-topbar-actions'>
                <button
                  type='button'
                  className='dailycard-user-chip'
                  aria-label={'\u0627\u0644\u062d\u0633\u0627\u0628'}
                >
                  <span className='dailycard-user-copy'>
                    <span className='dailycard-user-label'>
                      {'\u0627\u0644\u062d\u0633\u0627\u0628'}
                    </span>
                    <span className='dailycard-user-name'>BilyUser</span>
                  </span>
                  <span className='dailycard-user-avatar'>
                    <UserRound className='h-4 w-4' />
                  </span>
                </button>

                <div className='dailycard-balance-chip'>
                  <Wallet className='h-4 w-4' />
                  <span>{walletBalance}</span>
                </div>

                <button
                  type='button'
                  className='dailycard-icon-button'
                  aria-label={'\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a'}
                >
                  <Bell className='h-4 w-4' />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

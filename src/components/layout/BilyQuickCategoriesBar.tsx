'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLocale } from '@/components/i18n/locale-provider'

type QuickCategory = {
  id: string
  labelKey: string
  href: string
  icon: string
  pathname: string
}

const quickCategories: QuickCategory[] = [
  { id: 'top', labelKey: 'category_top', href: '/', icon: '🔥', pathname: '/' },
  { id: 'apps', labelKey: 'category_apps', href: '/products?segment=apps', icon: '📱', pathname: '/products' },
  { id: 'games', labelKey: 'category_games', href: '/products?segment=games', icon: '🎮', pathname: '/products' },
  { id: 'cards', labelKey: 'category_cards', href: '/products?segment=cards', icon: '🎫', pathname: '/products' },
  { id: 'wallets', labelKey: 'category_wallets', href: '/products?segment=wallets', icon: '👜', pathname: '/products' },
  { id: 'balance', labelKey: 'category_balance', href: '/products?segment=balance', icon: '💳', pathname: '/products' },
  { id: 'social', labelKey: 'category_social', href: '/products?segment=social', icon: '📣', pathname: '/products' },
  { id: 'entertainment', labelKey: 'category_entertainment', href: '/products?segment=entertainment', icon: '🎬', pathname: '/products' },
  { id: 'accounts', labelKey: 'category_accounts', href: '/products?segment=accounts', icon: '🪪', pathname: '/products' },
]

export default function BilyQuickCategoriesBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, direction } = useLocale()
  const activeSegment = searchParams.get('segment')
  const isMobileProductPage = pathname.startsWith('/products/')

  return (
    <section className={`${isMobileProductPage ? 'hidden lg:block' : ''} sticky top-[66px] z-[75] border-b border-violet-400/10 bg-[#020617]/94 backdrop-blur-md lg:top-[82px]`} dir={direction}>
      <div className='mx-auto max-w-[1600px] px-3 pb-1.5 pt-1 sm:px-4 lg:px-6 xl:mx-0 xl:max-w-none'>
        <div className='overflow-hidden rounded-[26px] border border-violet-400/12 bg-[linear-gradient(180deg,rgba(7,12,24,0.94),rgba(4,8,18,0.98))] shadow-[0_12px_28px_rgba(2,6,23,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]'>
          <div className='overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-x-visible [&::-webkit-scrollbar]:hidden'>
            <div className='flex min-w-max items-stretch gap-1.5 p-1.5 lg:min-w-0 lg:flex-wrap lg:justify-start lg:gap-2 lg:p-2'>
              {quickCategories.map((item) => {
                const isActive =
                  item.id === 'top'
                    ? pathname === '/'
                    : pathname === item.pathname && activeSegment === item.id

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group relative box-border w-[22.5%] shrink-0 overflow-hidden rounded-[18px] border px-1.5 py-1.5 text-center transition duration-200 lg:w-auto lg:min-w-[118px] lg:flex-1 lg:px-3 lg:py-2 ${
                      isActive
                        ? 'border-cyan-300/55 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_58%),linear-gradient(180deg,rgba(15,27,49,0.98),rgba(8,15,29,0.98))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_10px_22px_rgba(8,145,178,0.18)]'
                        : 'border-violet-300/18 bg-[linear-gradient(180deg,rgba(11,18,35,0.88),rgba(8,13,27,0.96))] hover:border-violet-300/30 hover:bg-[linear-gradient(180deg,rgba(15,24,46,0.92),rgba(8,13,27,0.98))]'
                    }`}
                  >
                    <span
                      className={`mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] shadow-[0_0_14px_rgba(34,211,238,0.08)] lg:h-8 lg:w-8 lg:text-sm ${
                        isActive
                          ? 'border-cyan-300/50 bg-cyan-400/14'
                          : 'border-white/10 bg-white/[0.04] group-hover:border-violet-300/35'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`mt-1 block line-clamp-2 text-[7px] leading-3 lg:text-[11px] lg:leading-4 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {t(item.labelKey)}
                    </span>
                    {isActive ? (
                      <span className='absolute inset-x-3 bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-300' />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

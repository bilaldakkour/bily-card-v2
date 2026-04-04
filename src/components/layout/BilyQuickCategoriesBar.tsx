'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Banknote,
  CreditCard,
  Gamepad2,
  Gem,
  KeyRound,
  LayoutGrid,
  Smartphone,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'

type QuickCategory = {
  id: string
  labelKey: string
  href: string
  icon: typeof LayoutGrid
}

const quickCategories: QuickCategory[] = [
  { id: 'top', labelKey: 'category_top', href: '/categories/top', icon: LayoutGrid },
  { id: 'apps', labelKey: 'category_apps', href: '/categories/apps', icon: Smartphone },
  { id: 'games', labelKey: 'category_games', href: '/categories/games', icon: Gamepad2 },
  { id: 'cards', labelKey: 'category_cards', href: '/categories/cards', icon: CreditCard },
  { id: 'wallets', labelKey: 'category_wallets', href: '/categories/wallets', icon: WalletCards },
  { id: 'balance', labelKey: 'category_balance', href: '/categories/balance', icon: Banknote },
  { id: 'social', labelKey: 'category_social', href: '/categories/social', icon: Gem },
  { id: 'entertainment', labelKey: 'category_entertainment', href: '/categories/entertainment', icon: Sparkles },
  { id: 'accounts', labelKey: 'category_accounts', href: '/categories/accounts', icon: KeyRound },
]

const homeQuickCategories = quickCategories

export default function BilyQuickCategoriesBar() {
  const pathname = usePathname()
  const { t, direction } = useLocale()
  const isHomePage = pathname === '/'
  const isCategoryPage = pathname.startsWith('/categories/')

  if (!isHomePage && !isCategoryPage) {
    return null
  }

  const activeCategoryId = isHomePage
    ? 'top'
    : pathname.split('/').filter(Boolean).at(-1) ?? 'top'

  return (
    <section className='home-categories-row-shell' dir={direction}>
      <div className='storefront-categories'>
        <div className='storefront-categories-track overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <div className='categories-row categories-row-home'>
            {homeQuickCategories.map((item) => {
              const Icon = item.icon
              const isActive = item.id === activeCategoryId

              const content = (
                <>
                  <span className='quick-category-card-sheen absolute inset-0 pointer-events-none' />
                  <span
                    className={`quick-category-icon ${isActive ? 'quick-category-icon-active' : ''}`}
                  >
                    <Icon className='h-4 w-4' />
                  </span>
                  <span
                    className={`quick-category-title ${isActive ? 'quick-category-title-active' : ''}`}
                  >
                    {t(item.labelKey)}
                  </span>
                  <span
                    className={`quick-category-edge ${isActive ? 'opacity-100' : 'opacity-35 group-hover:opacity-70'}`}
                  />
                </>
              )

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`category-card quick-category-card group ${isActive ? 'quick-category-card-active' : ''}`}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

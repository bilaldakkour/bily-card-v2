'use client'

import Link from 'next/link'
import {
  Bell,
  ChartColumn,
  Heart,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BilySupportActions } from '@/components/layout/BilySupportActions'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'

type SidebarItem = {
  key: string
  href: string
  icon: typeof Home
  value?: string
  adminOnly?: boolean
}

export default function RightSidebar({
  currentPath,
  isAdmin = false,
  walletBalance = '$0.00',
}: {
  currentPath: string
  isAdmin?: boolean
  walletBalance?: string
}) {
  const { t, direction } = useLocale()
  const isRtl = direction === 'rtl'
  const textAlign = isRtl ? 'text-right' : 'text-left'
  const isHomeLikePath = currentPath === '/' || currentPath === '/categories/top'

  const sidebarItems: SidebarItem[] = [
    { key: 'nav_home', href: '/', icon: Home },
    { key: 'nav_wallet', href: '/wallet', icon: Wallet, value: walletBalance },
    { key: 'nav_orders', href: '/orders', icon: ChartColumn },
    { key: 'nav_profile_report', href: '/profile#account-report', icon: User },
    { key: 'nav_history', href: '/history', icon: Bell },
    { key: 'nav_favorites', href: '/categories', icon: Heart },
    { key: 'nav_admin', href: '/admin', icon: ShieldCheck, adminOnly: true },
    { key: 'nav_level', href: '/profile#level-progress', icon: Sparkles },
    { key: 'nav_settings', href: '/profile', icon: Settings },
  ]

  return (
    <aside
      className='sidebar-panel-refined h-full w-full shrink-0 overflow-y-auto overflow-x-hidden border-l [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,0.3)_transparent]'
      dir={direction}
    >
      <div className='flex min-h-full flex-col gap-4 px-4 py-5'>
        <div className='sidebar-progress-card'>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <div className={textAlign}>
              <div className='text-[11px] text-slate-400'>{t('current_level')}</div>
              <div className='text-sm font-bold text-white'>{t('level_value')}</div>
            </div>

            <span className='sidebar-level-chip'>LVL 5</span>
          </div>

          <div className='h-2 overflow-hidden rounded-full bg-slate-800/80'>
            <div className='h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 shadow-[0_0_18px_rgba(34,211,238,0.2)]' />
          </div>

          <div className={`mt-2 text-[10px] text-slate-500 ${textAlign}`}>{t('level_progress')}</div>
        </div>

        <div className={`sidebar-balance-card ${textAlign}`}>
          <div className='mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/75'>
            {t('available_balance')}
          </div>
          <div className='mb-3 text-[2rem] font-black tracking-tight text-cyan-200'>{walletBalance}</div>

          <button
            type='button'
            className='btn-primary w-full rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-950 shadow-[0_16px_28px_rgba(34,211,238,0.14)]'
          >
            + {t('add_balance')}
          </button>
        </div>

        <div className='sidebar-top-actions grid grid-cols-3 gap-2'>
          <button
            type='button'
            onClick={() => {
              window.location.href = '/api/auth/logout'
            }}
            className='sidebar-logout-chip'
            title={t('logout')}
          >
            <LogOut className='h-3.5 w-3.5' />
            {t('logout')}
          </button>

          <ThemeToggle className='h-10 px-2 text-[11px]' />
          <LanguageSwitcher compact className='w-full' />
        </div>

        <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${textAlign}`}>
          {t('quick_access')}
        </div>

        <div className='sidebar-quick-links space-y-2'>
          {sidebarItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem
                key={item.key}
                label={t(item.key)}
                href={item.href}
                icon={item.icon}
                value={item.value}
                active={item.href !== '#' && (item.key === 'nav_home' ? isHomeLikePath : currentPath === item.href.split('#')[0])}
              />
            ))}
        </div>

        <div className='mt-auto space-y-4 pt-2'>
          <div className='sidebar-support-card'>
            <div className={`mb-2 text-sm font-bold text-cyan-200 ${textAlign}`}>
              {t('support_need_help')}
            </div>
            <p className={`mb-3 text-xs leading-6 text-slate-300 ${textAlign}`}>
              {t('support_sidebar_note')}
            </p>
            <BilySupportActions />
          </div>

          <div className='pt-1 text-center text-[10px] uppercase tracking-[0.24em] text-slate-500'>
            Bily Card
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  label,
  href,
  icon: Icon,
  active,
  value,
}: {
  label: string
  href: string
  icon: typeof Home
  active?: boolean
  value?: string
}) {
  const content = (
    <>
      <div className='flex items-center gap-2.5'>
        <span
          className={`sidebar-nav-icon inline-flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
            active
              ? 'border-cyan-300/28 bg-cyan-400/12 text-cyan-200'
              : 'border-white/8 bg-white/[0.035] text-slate-400'
          }`}
        >
          <Icon className='h-4 w-4' />
        </span>
        <span>{label}</span>
      </div>

      {value ? (
        <span className='rounded-full border border-cyan-300/15 bg-cyan-400/8 px-2 py-0.5 text-[10px] font-bold text-cyan-200'>
          {value}
        </span>
      ) : null}
    </>
  )

  const className = `sidebar-nav-item flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm ${
    active ? 'sidebar-nav-item-active text-white' : 'text-slate-300'
  }`

  if (href === '#') {
    return (
      <button type='button' className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  )
}

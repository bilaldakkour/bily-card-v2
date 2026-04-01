'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BilySupportActions } from '@/components/layout/BilySupportActions'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'

type SidebarItem = {
  key: string
  href: string
  icon: string
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

  const sidebarItems: SidebarItem[] = [
    { key: 'nav_home', href: '/', icon: '⌂' },
    { key: 'nav_wallet', href: '/wallet', icon: '◉', value: walletBalance },
    { key: 'nav_orders', href: '/orders', icon: '↻' },
    { key: 'nav_profile_report', href: '/profile', icon: '▣' },
    { key: 'nav_history', href: '/history', icon: '◰' },
    { key: 'nav_favorites', href: '/categories', icon: '♥' },
    { key: 'nav_admin', href: '/admin', icon: '▦', adminOnly: true },
    { key: 'nav_level', href: '#', icon: '◇' },
    { key: 'nav_settings', href: '/profile', icon: '⚙' },
  ]

  return (
    <aside className='h-full w-full shrink-0 overflow-y-auto overflow-x-hidden border-l border-cyan-400/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_24%),linear-gradient(180deg,rgba(23,31,54,0.96)_0%,rgba(16,23,40,0.96)_42%,rgba(13,19,34,0.98)_100%)] text-white [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,0.35)_transparent]' dir={direction}>
      <div className='flex min-h-full flex-col px-4 py-4'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className={textAlign}>
            <div className='text-lg font-black tracking-tight text-cyan-300'>Bily Card</div>
            <div className='text-[11px] text-slate-500'>{t('user_panel')}</div>
          </div>

          <div className='flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-sm font-black text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.10)]'>
            B
          </div>
        </div>

        <div className='panel-soft-surface mb-4 rounded-2xl p-3 backdrop-blur'>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <div className={textAlign}>
              <div className='text-[11px] text-slate-400'>{t('current_level')}</div>
              <div className='text-sm font-bold text-white'>{t('level_value')}</div>
            </div>

            <span className='rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200'>
              LVL 5
            </span>
          </div>

          <div className='h-2 overflow-hidden rounded-full bg-slate-700/60'>
            <div className='h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)]' />
          </div>

          <div className={`mt-2 text-[10px] text-slate-500 ${textAlign}`}>{t('level_progress')}</div>
        </div>

        <div className={`mb-4 rounded-2xl border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(21,125,148,.2),rgba(24,33,57,.88))] p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.04)] ${textAlign}`}>
          <div className='mb-1 text-[11px] text-cyan-100/80'>{t('available_balance')}</div>
          <div className='mb-3 text-2xl font-black tracking-tight text-cyan-300'>{walletBalance}</div>

          <button
            type='button'
            className='w-full rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-3 py-2.5 text-sm font-bold text-white transition hover:from-cyan-400 hover:via-sky-400 hover:to-blue-400'
          >
            + {t('add_balance')}
          </button>
        </div>

        <div className='mb-4 grid grid-cols-3 gap-2'>
          <button
            type='button'
            onClick={() => {
              window.location.href = '/api/auth/logout'
            }}
            className='inline-flex h-10 items-center justify-center gap-1 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-2 text-[11px] text-rose-200 transition duration-200 ease-out hover:scale-[1.02] hover:bg-rose-500/12 active:scale-95'
            title={t('logout')}
          >
            <LogOut className='h-3.5 w-3.5' />
            {t('logout')}
          </button>

          <ThemeToggle className='h-10 px-2 text-[11px]' />

          <LanguageSwitcher compact className='w-full' />
        </div>

        <div className={`mb-2 text-[11px] font-semibold text-slate-500 ${textAlign}`}>{t('quick_access')}</div>
        <div className='space-y-1.5'>
          {sidebarItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem
                key={item.key}
                label={t(item.key)}
                href={item.href}
                icon={item.icon}
                value={item.value}
                active={item.href !== '#' && currentPath === item.href}
              />
            ))}
        </div>

        <div className='mt-auto pt-5'>
          <div className='support-cta-panel rounded-2xl p-3'>
            <div className={`mb-2 text-sm font-bold text-cyan-200 ${textAlign}`}>{t('support_need_help')}</div>
            <p className={`mb-3 text-xs leading-6 text-slate-300 ${textAlign}`}>{t('support_sidebar_note')}</p>
            <BilySupportActions />
          </div>

          <div className='pt-4 text-center text-[10px] text-slate-500'>Bily Card UI</div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  label,
  href,
  icon,
  active,
  value,
}: {
  label: string
  href: string
  icon: string
  active?: boolean
  value?: string
}) {
  const content = (
    <>
      <div className='flex items-center gap-2'>
        <span className={`text-sm ${active ? 'text-cyan-300' : 'text-slate-500'}`}>{icon}</span>
        <span>{label}</span>
      </div>

      {value ? (
        <span className='rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200'>
          {value}
        </span>
      ) : null}
    </>
  )

  const className = `subtle-hover-surface flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
    active
      ? 'border border-cyan-300/15 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]'
      : 'border border-transparent text-slate-300'
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

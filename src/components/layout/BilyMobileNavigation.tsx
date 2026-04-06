'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import {
  Bell,
  ChartColumn,
  Heart,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BilySupportActions } from '@/components/layout/BilySupportActions'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'

type BilyMobileNavigationProps = {
  sidebarOpen: boolean
  onOpenSidebar: () => void
  onCloseSidebar: () => void
  currentPath: string
  userName?: string
  userAvatar?: string
  userLevel?: number
  walletBalance?: string
  notificationsCount?: number
  onLogout?: () => void
}

export default function BilyMobileNavigation({
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  currentPath,
  userName = 'Bily Card User',
  userAvatar,
  userLevel = 5,
  walletBalance = '$0.80',
  notificationsCount = 0,
  onLogout,
}: BilyMobileNavigationProps) {
  const { t, direction } = useLocale()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isMobileProductPage = currentPath.startsWith('/products/')
  const textAlign = direction === 'rtl' ? 'text-right' : 'text-left'
  const isHomeLikePath = currentPath === '/' || currentPath === '/categories/top'

  const quickLinks = useMemo(
    () => [
      { key: 'home', label: t('nav_home'), href: '/', icon: Home },
      { key: 'wallet', label: t('nav_wallet'), href: '/wallet', icon: Wallet },
      { key: 'orders', label: t('nav_orders'), href: '/orders', icon: ChartColumn },
      { key: 'profile', label: t('nav_profile_report'), href: '/profile#account-report', icon: User },
      { key: 'history', label: t('nav_history'), href: '/history', icon: ChartColumn },
      { key: 'favorites', label: t('nav_favorites'), href: '/categories', icon: Heart },
      { key: 'admin', label: t('nav_admin'), href: '/admin', icon: ShieldCheck },
      { key: 'level', label: t('nav_level'), href: '/profile#level-progress', icon: ShieldCheck },
      { key: 'settings', label: t('nav_settings'), href: '/profile', icon: Settings },
    ],
    [t]
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [sidebarOpen])

  const progress = Math.min(100, Math.max(0, userLevel * 10))

  return (
    <>
      <div
        className={`theme-overlay fixed inset-0 z-[90] transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        } ${isMobileProductPage ? 'hidden' : ''}`}
        onClick={onCloseSidebar}
        aria-hidden={!sidebarOpen}
      />

      <aside
        className={`theme-drawer-shell fixed top-0 bottom-0 right-0 z-[95] h-[100dvh] w-[74%] max-w-[340px] border-l px-3.5 py-3 backdrop-blur-xl transition-transform duration-300 ease-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isMobileProductPage ? 'hidden' : ''}`}
        dir={direction}
      >
        <div className='relative z-10 flex h-full min-h-0 flex-col'>
          <div ref={scrollContainerRef} className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+16px)]'>
            <div className='flex flex-col gap-3'>
              <div className='w-full rounded-3xl border border-violet-400/20 bg-white/[0.03] p-2.5 shadow-[0_0_24px_rgba(139,92,246,0.12)]'>
                <div className='flex items-start justify-between gap-2.5'>
                  <button
                    type='button'
                    onClick={onCloseSidebar}
                    className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/12 text-violet-200 transition duration-200 ease-out hover:scale-[1.02] hover:bg-violet-500/20 active:scale-95'
                    aria-label={t('close_menu')}
                  >
                    <X className='h-4 w-4' />
                  </button>

                  <div className={`min-w-0 flex-1 ${textAlign}`}>
                    <div className='truncate text-sm font-semibold text-slate-100'>{userName}</div>
                    <div className='mt-0.5 text-[11px] text-slate-400'>
                      {t('nav_level')} {userLevel}
                    </div>
                    <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/90'>
                      <div className='h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_16px_rgba(168,85,247,0.35)]' style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className='h-8 w-8 shrink-0 rounded-xl border border-violet-300/35 object-cover shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    />
                  ) : (
                    <div className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-300/35 bg-gradient-to-br from-violet-500/20 to-cyan-400/12 text-[10px] font-semibold text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.28)]'>
                      BC
                    </div>
                  )}
                </div>
              </div>

              <div className={`w-full rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/18 via-cyan-500/10 to-blue-500/10 p-3 shadow-[0_0_26px_rgba(16,185,129,0.2)] ${textAlign}`}>
                <div className='text-[11px] text-slate-300'>{t('available_balance')}</div>
                <div className='mt-1 text-[1.35rem] font-extrabold tracking-tight text-emerald-300'>{walletBalance}</div>
                <Link
                  href='/wallet'
                  className='mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-2 text-[12px] font-semibold text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.24)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-emerald-500/20'
                >
                  {t('add_balance')}
                </Link>
              </div>

              <div className='grid w-full grid-cols-3 gap-2'>
                <button
                  type='button'
                  onClick={() => (onLogout ? onLogout() : (window.location.href = '/api/auth/logout'))}
                  className='inline-flex h-9 items-center justify-center gap-1 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-1.5 text-[10px] text-rose-200 transition duration-200 ease-out hover:scale-[1.02] hover:bg-rose-500/12 active:scale-95'
                  title={t('logout')}
                >
                  <LogOut className='h-3 w-3' />
                  {t('logout')}
                </button>
                <ThemeToggle className='h-9 px-1.5 text-[10px]' />
                <LanguageSwitcher compact className='w-full' />
              </div>

              <div className={`text-[11px] font-semibold text-slate-500 ${textAlign}`}>{t('quick_access')}</div>

              <nav className='w-full space-y-1.5'>
                {quickLinks.map((item) => {
                  const isActive =
                    item.href !== '#' &&
                    (item.key === 'home' ? isHomeLikePath : currentPath === item.href.split('#')[0])
                  const Icon = item.icon

                  if (item.href === '#') {
                    return (
                      <button
                        key={item.key}
                        type='button'
                        className='flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[12px] text-slate-200 transition duration-200 ease-out hover:translate-x-[2px] hover:scale-[1.01] hover:border-violet-300/20 hover:bg-white/8'
                      >
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-500/10 text-cyan-200'>
                            <Icon className='h-3.5 w-3.5' />
                          </span>
                          <span className='truncate'>{item.label}</span>
                        </div>
                        <span className='h-1.5 w-1.5 rounded-full bg-slate-500/80' />
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={onCloseSidebar}
                      className={`flex items-center justify-between rounded-2xl border px-2.5 py-2 text-[12px] transition duration-200 ease-out hover:translate-x-[2px] hover:scale-[1.01] ${
                        isActive
                          ? 'border-violet-400/40 bg-violet-500/14 text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-violet-300/20 hover:bg-white/8'
                      }`}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                            isActive
                              ? 'border-violet-300/40 bg-violet-500/18 text-violet-100 shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                              : 'border-cyan-300/20 bg-cyan-500/10 text-cyan-200'
                          }`}
                        >
                          <Icon className='h-3.5 w-3.5' />
                        </span>
                        <span className='truncate'>{item.label}</span>
                      </div>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-violet-300' : 'bg-slate-500/80'}`} />
                    </Link>
                  )
                })}
              </nav>

              <div className='support-cta-panel w-full rounded-[22px] p-2.5'>
                <div className={`text-sm font-semibold text-violet-100 ${textAlign}`}>{t('support_need_help')}</div>
                <p className={`mt-1 text-[11px] text-slate-300 ${textAlign}`}>{t('support_mobile_note')}</p>
                <BilySupportActions compact className='mt-3' />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <nav className={`fixed inset-x-0 bottom-2.5 z-40 px-3 md:hidden ${isMobileProductPage ? 'hidden' : ''}`} dir={direction}>
        <div className='theme-dock-shell mx-auto relative flex h-[65px] max-w-lg items-center justify-between rounded-[24px] border px-1.5 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-violet-300/35 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:rounded-[24px] after:bg-gradient-to-t after:from-transparent after:to-cyan-300/[0.03]'>
          <BottomNavItem href='/' label={t('nav_home')} icon={Home} active={isHomeLikePath} />
          <BottomNavItem
            href='/history'
            label={t('nav_notifications')}
            icon={Bell}
            active={currentPath === '/history'}
            badge={notificationsCount > 0 ? String(notificationsCount) : undefined}
          />
          <BottomNavItem href='/categories' label={t('nav_favorites')} icon={Heart} active={currentPath === '/categories'} />
          <BottomNavItem href='/profile' label={t('nav_account')} icon={User} active={currentPath === '/profile'} />

          <button
            type='button'
            onClick={onOpenSidebar}
            className={`relative flex min-h-[54px] min-w-[56px] flex-1 flex-col items-center justify-center rounded-xl px-1 text-[10px] transition ${
              sidebarOpen
                ? 'border border-violet-400/38 bg-violet-500/16 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.22)]'
                : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            <span className={`mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition ${sidebarOpen ? 'scale-110 border-violet-300/45 bg-violet-500/16 text-violet-200' : ''}`}>
              <Menu className='h-[15px] w-[15px]' />
            </span>
            {t('nav_menu')}
          </button>
        </div>
      </nav>
    </>
  )
}

function BottomNavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string
  label: string
  icon: typeof Home
  active?: boolean
  badge?: string
}) {
  const isFavorites = href === '/categories'

  return (
    <Link
      href={href}
      className={`relative flex min-h-[54px] min-w-[56px] flex-1 flex-col items-center justify-center rounded-xl px-1 text-[10px] transition duration-200 ease-out active:scale-95 ${
        href === '/' && active
          ? 'scale-110 border border-violet-300/45 bg-gradient-to-b from-violet-400/20 to-violet-500/10 text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.34),0_10px_24px_rgba(139,92,246,0.16),inset_0_0_14px_rgba(139,92,246,0.18)]'
          : isFavorites
            ? active
              ? 'border border-rose-400/45 bg-rose-500/15 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.24),inset_0_0_12px_rgba(244,63,94,0.14)]'
              : 'text-slate-200 hover:bg-white/5'
            : active
              ? 'border border-violet-400/35 bg-violet-500/15 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.2),inset_0_0_12px_rgba(139,92,246,0.12)]'
              : 'text-slate-200 hover:bg-white/5'
      }`}
    >
      <span
        className={`mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition duration-200 ease-out ${
          href === '/' && active
            ? 'scale-110 border-violet-300/50 bg-violet-500/16 text-violet-200 shadow-[0_0_16px_rgba(139,92,246,0.28)]'
            : isFavorites
              ? active
                ? 'scale-110 border-rose-300/45 bg-rose-500/15 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.28)] animate-pulse'
                : 'hover:scale-105'
              : active
                ? 'scale-110 border-violet-300/40 bg-violet-500/15 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.22)]'
                : 'hover:scale-105'
        }`}
      >
        <Icon className='h-[15px] w-[15px]' />
      </span>
      <span className={`${active ? 'font-semibold' : ''}`}>{label}</span>
      {badge ? (
        <span className='absolute right-1.5 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white'>{badge}</span>
      ) : null}
    </Link>
  )
}

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import { requireAdmin } from '@/modules/security/guards'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const navGroups = [
  {
    title: 'الواجهة الرئيسية',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'المنتجات والمحتوى',
    items: [
      { label: 'Banners', href: '/admin/banners', icon: ImageIcon },
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Providers', href: '/admin/providers', icon: Store },
      { label: 'Pricing', href: '/admin/pricing', icon: CreditCard },
      { label: 'Stock', href: '/admin/stock', icon: Boxes },
    ],
  },
  {
    title: 'الطلبات والمالية',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Manual Orders', href: '/admin/manual-orders', icon: FileText },
      { label: 'Deposits', href: '/admin/deposits', icon: Wallet },
      { label: 'Wallet Methods', href: '/admin/wallet-methods', icon: CreditCard },
    ],
  },
  {
    title: 'الإدارة العامة',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) redirect('/login')

  const h = headers()
  const currentPath =
    h.get('x-pathname') ??
    h.get('next-url') ??
    h.get('x-invoke-path') ??
    h.get('x-matched-path') ??
    ''

  const flatItems = navGroups.flatMap((group) => group.items)
  const currentItem =
    flatItems.find((item) => currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(`${item.href}/`))) ??
    flatItems[0]

  const today = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date())

  return (
    <main className='app-shell-surface min-h-screen text-white'>
      <div className='grid min-h-screen md:grid-cols-[272px_1fr]'>
        <aside className='admin-sidebar-shell hidden border-r border-cyan-400/10 md:sticky md:top-0 md:block md:h-screen'>
          <div className='flex h-full flex-col'>
            <div className='border-b border-cyan-400/10 px-5 py-5'>
              <div className='text-[15px] font-black tracking-tight text-white'>Bily Card Admin</div>
              <div className='mt-1 text-xs text-slate-400'>لوحة تحكم مرتبة لكل وظائف الإدارة</div>
            </div>

            <div className='flex-1 overflow-y-auto px-4 py-4'>
              <nav className='space-y-5'>
                {navGroups.map((group) => (
                  <div key={group.title} className='space-y-2'>
                    <div className='px-2 text-[11px] font-semibold text-slate-500'>{group.title}</div>
                    <div className='space-y-1.5'>
                      {group.items.map((item) => {
                        const active =
                          currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(`${item.href}/`))
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`admin-nav-link flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${
                              active
                                ? 'admin-nav-link-active text-white'
                                : 'border-transparent text-slate-200'
                            }`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${
                                active
                                  ? 'border-white/15 bg-white/10 text-white'
                                  : 'border-cyan-300/10 bg-cyan-400/[0.05] text-cyan-200'
                              }`}
                            >
                              <Icon className='h-4 w-4' />
                            </span>
                            <span className='font-medium'>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <section className='admin-layout-stage min-w-0 bg-transparent'>
          <header className='admin-topbar-shell header-shell border-b border-cyan-400/10'>
            <div className='admin-topbar-inner flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7 lg:py-[1.125rem]'>
              <div>
                <div className='admin-shell-kicker text-[11px] sm:text-xs'>Admin Panel</div>
                <h1 className='admin-shell-title mt-1'>{currentItem.label}</h1>
              </div>

              <div className='flex items-center gap-2.5 self-start lg:self-auto'>
                <ThemeToggle compact />
                <Link
                  href='/'
                  className='inline-flex items-center gap-2 rounded-2xl border border-cyan-300/22 bg-cyan-400/[0.06] px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/38 hover:bg-cyan-400/[0.1] sm:px-4 sm:py-2.5 sm:text-sm'
                >
                  <ArrowLeft className='h-4 w-4' />
                  Back to Site
                </Link>
                <div className='text-xs text-slate-400 sm:text-sm'>{today}</div>
              </div>
            </div>

            <div className='border-t border-cyan-400/10 px-3 py-3 md:hidden'>
              <div className='space-y-3'>
                {navGroups.map((group) => (
                  <div key={group.title} className='space-y-2'>
                    <div className='px-1 text-[11px] font-semibold text-slate-500'>{group.title}</div>
                    <div className='overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                      <div className='flex min-w-max gap-2 pb-1'>
                        {group.items.map((item) => {
                          const active =
                            currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(`${item.href}/`))
                          const Icon = item.icon

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`admin-nav-link inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs whitespace-nowrap ${
                                active
                                  ? 'admin-nav-link-active text-white'
                                  : 'border-cyan-300/12 bg-white/[0.03] text-slate-200'
                              }`}
                              aria-current={active ? 'page' : undefined}
                            >
                              <Icon className='h-3.5 w-3.5' />
                              <span>{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div className='admin-content-wrap px-3 py-3 sm:px-6 sm:py-5 lg:px-7 lg:py-6'>
            <div className='admin-content-shell panel-soft-surface rounded-[24px] p-3 sm:rounded-[28px] sm:p-5 lg:rounded-[30px] lg:p-6'>
              <div className='admin-page-frame'>{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

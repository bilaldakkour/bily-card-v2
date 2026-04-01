'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import RightSidebar from './RightSidebar'
import BilyMobileNavigation from './BilyMobileNavigation'
import BilyFooter from './BilyFooter'

export default function PublicShell({
  children,
  isAdmin = false,
  walletBalance = '$0.00',
}: {
  children: React.ReactNode
  isAdmin?: boolean
  walletBalance?: string
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobileProductPage = pathname.startsWith('/products/')

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const openSidebar = () => setSidebarOpen(true)
    window.addEventListener('bily:open-sidebar', openSidebar)
    return () => window.removeEventListener('bily:open-sidebar', openSidebar)
  }, [])

  return (
    <div className='app-shell-surface min-h-screen overflow-x-hidden text-white'>
      <aside className='hidden lg:fixed lg:inset-y-0 lg:right-0 lg:z-[88] lg:block lg:w-[300px]'>
        <div className='desktop-sidebar-surface h-full overflow-y-auto border-l'>
          <RightSidebar currentPath={pathname} isAdmin={isAdmin} walletBalance={walletBalance} />
        </div>
      </aside>

      <div
        className={`mx-auto max-w-[1600px] px-4 py-4 lg:mx-0 lg:max-w-[min(1380px,calc(100vw-324px))] lg:px-6 lg:py-5 ${isMobileProductPage ? 'px-0 py-0 sm:px-5 sm:py-5 lg:px-6 lg:py-5' : ''}`}
      >
        <main className={`min-w-0 ${isMobileProductPage ? 'pb-0 md:pb-0' : 'pb-24 md:pb-0'}`}>
          {children}
        </main>
      </div>

      <div className={`${isMobileProductPage ? 'hidden md:block' : ''} pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-0`}>
        <BilyFooter />
      </div>

      <BilyMobileNavigation
        sidebarOpen={sidebarOpen}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCloseSidebar={() => setSidebarOpen(false)}
        currentPath={pathname}
        walletBalance={walletBalance}
      />
    </div>
  )
}

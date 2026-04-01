import BilyQuickCategoriesBar from '@/components/layout/BilyQuickCategoriesBar'
import PublicShell from '@/components/layout/PublicShell'
import { SiteHeader } from '@/components/layout/site-header'
import { fromMinor } from '@/core/money'
import { getWalletSummary } from '@/features/wallet/service'
import { redirect } from 'next/navigation'
import { getSession } from '@/modules/security/session'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const wallet = await getWalletSummary(session.sub)
  const walletBalance = `$${fromMinor(wallet.balanceMinor ?? 0).toFixed(2)}`

  return (
    <div className='lg:pr-[300px]'>
      <SiteHeader walletBalance={walletBalance} />
      <BilyQuickCategoriesBar />
      <main className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:mx-0 lg:max-w-none lg:px-0 lg:py-0'>
        <PublicShell isAdmin={session?.role === 'admin'} walletBalance={walletBalance}>
          {children}
        </PublicShell>
      </main>
    </div>
  )
}

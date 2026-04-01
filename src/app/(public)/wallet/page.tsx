export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/modules/security/guards'
import { getWalletSummary, getDepositRequestsForUser } from '@/features/wallet/service'
import { listPublicDepositMethods } from '@/features/wallet/deposit-methods.service'
import { WalletClient } from '@/components/wallet/wallet-client'

export default async function WalletPage() {
  const session = await requireAuth().catch(() => null)
  if (!session) redirect('/login')

  const [wallet, deposits, methods] = await Promise.all([
    getWalletSummary(session.sub),
    getDepositRequestsForUser(session.sub),
    listPublicDepositMethods(),
  ])

  return <WalletClient initialWallet={wallet as any} initialDeposits={deposits as any} initialMethods={methods as any} />
}

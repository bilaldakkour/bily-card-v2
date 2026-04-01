export const dynamic = 'force-dynamic'

import { AdminWalletMethodsManager } from '@/components/admin/admin-wallet-methods-manager'
import { listAdminDepositMethods } from '@/features/wallet/deposit-methods.service'

export default async function AdminWalletMethodsPage() {
  const initial = await listAdminDepositMethods()
  return <AdminWalletMethodsManager initial={initial as any} />
}

export const dynamic = 'force-dynamic'

import { getDepositRequestsForAdmin } from '@/features/wallet/service'
import { AdminDepositsManager } from '@/components/admin/admin-deposits-manager'

export default async function AdminDepositsPage() {
  const initial = await getDepositRequestsForAdmin('pending')
  return <AdminDepositsManager initial={initial as any} />
}

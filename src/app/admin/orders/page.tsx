export const dynamic = 'force-dynamic'

import { getOrdersForAdmin } from '@/features/orders/service'
import { AdminOrdersManager } from '@/components/admin/admin-orders-manager'

export default async function AdminOrdersPage() {
  const initial = await getOrdersForAdmin({ page: 1, pageSize: 50 })
  return <AdminOrdersManager initial={initial as any} />
}

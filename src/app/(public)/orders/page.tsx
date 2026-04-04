export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/modules/security/guards'
import { getCustomerOrders } from '@/features/orders/service'
import { OrdersClient } from '@/components/orders/orders-client'

export default async function OrdersPage() {
  const session = await requireAuth().catch(() => null)
  if (!session) redirect('/login')

  const orders = await getCustomerOrders(session.sub, 1, 50).catch(() => ({ items: [], total: 0, page: 1, pageSize: 50 }))

  return <OrdersClient initial={orders as any} />
}

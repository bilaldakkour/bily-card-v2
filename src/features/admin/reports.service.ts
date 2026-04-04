import { connectDb } from '@/modules/db/connection'
import { isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { OrderModel, WalletDepositRequestModel } from '@/domain/models'
import { listSupabaseDeposits, listSupabaseOrders } from '@/modules/supabase/commerce-store'

function getDateRange(range: string, from?: string | null, to?: string | null) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (range === 'today') return { from: startOfToday, to: now }
  if (range === 'yesterday') {
    const yStart = new Date(startOfToday)
    yStart.setDate(yStart.getDate() - 1)
    return { from: yStart, to: startOfToday }
  }
  if (range === 'week') {
    const weekStart = new Date(startOfToday)
    weekStart.setDate(weekStart.getDate() - 6)
    return { from: weekStart, to: now }
  }
  if (range === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: monthStart, to: now }
  }
  if (range === 'custom' && from && to) return { from: new Date(from), to: new Date(to) }
  return { from: startOfToday, to: now }
}

export async function buildReports(range: string, fromParam?: string | null, toParam?: string | null) {
  const { from, to } = getDateRange(range, fromParam, toParam)

  if (isSupabaseProvider()) {
    const orders = (await listSupabaseOrders()).filter((order: any) => {
      const createdAt = new Date(order.createdAt)
      return createdAt >= from && createdAt <= to
    })
    const completedOrders = orders.filter((order: any) => order.status === 'completed')
    const refundedOrders = orders.filter((order: any) => order.status === 'refunded')
    const productMap = new Map<string, { _id: string; qty: number; revenueMinor: number; profitMinor: number }>()

    for (const order of completedOrders as any[]) {
      const current = productMap.get(order.productName) ?? {
        _id: order.productName,
        qty: 0,
        revenueMinor: 0,
        profitMinor: 0,
      }
      current.qty += 1
      current.revenueMinor += order.totalPriceMinor
      current.profitMinor += order.profitMinor
      productMap.set(order.productName, current)
    }

    const pendingDeposits = (await listSupabaseDeposits()).filter((deposit: any) => deposit.status === 'pending').length

    return {
      range,
      from,
      to,
      summary: {
        ordersTotal: orders.length,
        completedTotal: completedOrders.length,
        refundedTotal: refundedOrders.length,
        revenueMinor: completedOrders.reduce((sum: number, order: any) => sum + order.totalPriceMinor, 0),
        costMinor: completedOrders.reduce((sum: number, order: any) => sum + order.totalCostMinor, 0),
        profitMinor: completedOrders.reduce((sum: number, order: any) => sum + order.profitMinor, 0),
      },
      topProducts: Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 8),
      pendingDeposits,
    }
  }

  if (!isMongoEnabled()) {
    return {
      range,
      from,
      to,
      summary: {
        ordersTotal: 0,
        completedTotal: 0,
        refundedTotal: 0,
        revenueMinor: 0,
        costMinor: 0,
        profitMinor: 0,
      },
      topProducts: [],
      pendingDeposits: 0,
    }
  }

  await connectDb()

  const match = { createdAt: { $gte: from, $lte: to } }

  const [summary] = await OrderModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        ordersTotal: { $sum: 1 },
        completedTotal: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        refundedTotal: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
        revenueMinor: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPriceMinor', 0] } },
        costMinor: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalCostMinor', 0] } },
        profitMinor: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$profitMinor', 0],
          },
        },
      },
    },
  ])

  const topProducts = await OrderModel.aggregate([
    { $match: { ...match, status: 'completed' } },
    {
      $group: {
        _id: '$productName',
        qty: { $sum: 1 },
        revenueMinor: { $sum: '$totalPriceMinor' },
        profitMinor: { $sum: '$profitMinor' },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: 8 },
  ])

  const pendingDeposits = await WalletDepositRequestModel.countDocuments({ status: 'pending' })

  return {
    range,
    from,
    to,
    summary: summary ?? {
      ordersTotal: 0,
      completedTotal: 0,
      refundedTotal: 0,
      revenueMinor: 0,
      costMinor: 0,
      profitMinor: 0,
    },
    topProducts,
    pendingDeposits,
  }
}

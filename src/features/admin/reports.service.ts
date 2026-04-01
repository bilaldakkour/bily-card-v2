import { connectDb } from '@/modules/db/connection'
import { OrderModel, WalletDepositRequestModel } from '@/domain/models'

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
  await connectDb()

  const { from, to } = getDateRange(range, fromParam, toParam)
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

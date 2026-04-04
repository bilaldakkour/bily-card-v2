import mongoose from 'mongoose'
import { connectDb } from '@/modules/db/connection'
import { ApiError } from '@/core/http'
import { isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { OrderModel, UserModel, WalletDepositRequestModel, WalletTransactionModel } from '@/domain/models'
import {
  getSupabaseUserRecord,
  listSupabaseDeposits,
  listSupabaseOrders,
  listSupabaseWalletTransactions,
} from '@/modules/supabase/commerce-store'

type ProfileOverview = {
  user: {
    _id: string
    name: string
    email: string
    role: 'customer' | 'admin'
    isActive: boolean
    walletBalanceMinor: number
    createdAt: Date
  }
  summary: {
    ordersTotal: number
    completedTotal: number
    refundedTotal: number
    spentMinor: number
  }
  pendingDeposits: number
  recentOrders: Array<{
    _id: string
    productName: string
    totalPriceMinor: number
    status: string
    createdAt: Date
    fulfillMode: string
  }>
}

export async function getCustomerProfileOverview(userId: string): Promise<ProfileOverview> {
  if (isSupabaseProvider()) {
    const user = await getSupabaseUserRecord(userId)
    if (!user) {
      return {
        user: {
          _id: userId,
          name: 'User',
          email: '',
          role: 'customer',
          isActive: true,
          walletBalanceMinor: 0,
          createdAt: new Date(0),
        },
        summary: {
          ordersTotal: 0,
          completedTotal: 0,
          refundedTotal: 0,
          spentMinor: 0,
        },
        pendingDeposits: 0,
        recentOrders: [],
      }
    }

    const orders = (await listSupabaseOrders()).filter((order: any) => order.userId === user.userId)
    const deposits = (await listSupabaseDeposits(user.userId)).filter((deposit: any) => deposit.status === 'pending')

    return {
      user: {
        _id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        walletBalanceMinor: user.walletBalanceMinor,
        createdAt: new Date(user.createdAt),
      },
      summary: {
        ordersTotal: orders.length,
        completedTotal: orders.filter((order: any) => order.status === 'completed').length,
        refundedTotal: orders.filter((order: any) => order.status === 'refunded').length,
        spentMinor: orders.reduce((sum: number, order: any) => sum + order.totalPriceMinor, 0),
      },
      pendingDeposits: deposits.length,
      recentOrders: orders
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((order: any) => ({
          _id: order._id,
          productName: order.productName,
          totalPriceMinor: order.totalPriceMinor,
          status: order.status,
          createdAt: new Date(order.createdAt),
          fulfillMode: order.fulfillMode,
        })),
    }
  }

  if (!isMongoEnabled()) {
    return {
      user: {
        _id: userId,
        name: 'User',
        email: '',
        role: 'customer',
        isActive: true,
        walletBalanceMinor: 0,
        createdAt: new Date(0),
      },
      summary: {
        ordersTotal: 0,
        completedTotal: 0,
        refundedTotal: 0,
        spentMinor: 0,
      },
      pendingDeposits: 0,
      recentOrders: [],
    }
  }

  await connectDb()
  const objectId = new mongoose.Types.ObjectId(userId)

  const [userDoc, ordersTotal, completedTotal, refundedTotal, spentAgg, recentOrdersRaw, pendingDeposits] = await Promise.all([
    UserModel.findById(userId)
      .select({ name: 1, email: 1, role: 1, isActive: 1, walletBalanceMinor: 1, createdAt: 1 })
      .lean(),
    OrderModel.countDocuments({ userId: objectId }),
    OrderModel.countDocuments({ userId: objectId, status: 'completed' }),
    OrderModel.countDocuments({ userId: objectId, status: 'refunded' }),
    OrderModel.aggregate([{ $match: { userId: objectId } }, { $group: { _id: null, spentMinor: { $sum: '$totalPriceMinor' } } }]),
    OrderModel.find({ userId: objectId })
      .select({ productName: 1, totalPriceMinor: 1, status: 1, createdAt: 1, fulfillMode: 1 })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    WalletDepositRequestModel.countDocuments({ userId: objectId, status: 'pending' }),
  ])

  if (!userDoc) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

  const user = {
    _id: String((userDoc as any)._id),
    name: (userDoc as any).name,
    email: (userDoc as any).email,
    role: (userDoc as any).role,
    isActive: Boolean((userDoc as any).isActive),
    walletBalanceMinor: Number((userDoc as any).walletBalanceMinor ?? 0),
    createdAt: new Date((userDoc as any).createdAt),
  }

  const recentOrders = recentOrdersRaw.map((item: any) => ({
    _id: String(item._id),
    productName: item.productName,
    totalPriceMinor: Number(item.totalPriceMinor ?? 0),
    status: item.status,
    createdAt: new Date(item.createdAt),
    fulfillMode: item.fulfillMode,
  }))

  return {
    user,
    summary: {
      ordersTotal,
      completedTotal,
      refundedTotal,
      spentMinor: spentAgg[0]?.spentMinor ?? 0,
    },
    pendingDeposits,
    recentOrders,
  }
}

export async function getCustomerHistory(userId: string, filter: 'all' | 'orders' | 'wallet') {
  if (isSupabaseProvider()) {
    const [orders, wallet] = await Promise.all([
      filter === 'wallet' ? [] : listSupabaseOrders().then((rows: any[]) => rows.filter((row: any) => row.userId === userId)),
      filter === 'orders' ? [] : listSupabaseWalletTransactions(userId),
    ])

    const history = [
      ...orders.map((order: any) => ({
        id: order._id,
        kind: 'order' as const,
        title: order.productName,
        sub: `${order.status} / ${order.fulfillMode}`,
        amountMinor: -Math.abs(order.totalPriceMinor ?? 0),
        createdAt: order.createdAt,
        balanceBeforeMinor: null as number | null,
        balanceAfterMinor: null as number | null,
        refundAmountMinor: null as number | null,
        refundedAt: null as string | null,
      })),
      ...wallet.map((tx: any) => ({
        id: tx._id,
        kind: 'wallet' as const,
        title: tx.type,
        sub: tx.note || 'wallet activity',
        amountMinor: tx.amountMinor,
        createdAt: tx.createdAt,
        balanceBeforeMinor: tx.balanceAfterMinor - tx.amountMinor,
        balanceAfterMinor: tx.balanceAfterMinor,
        refundAmountMinor: null as number | null,
        refundedAt: null as string | null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const orderTxs = wallet.filter((tx: any) => tx.referenceType === 'order' && tx.referenceId)
    const trail = new Map<string, any>()
    for (const tx of orderTxs as any[]) {
      const key = String(tx.referenceId)
      const current = trail.get(key) ?? {}
      if (tx.type === 'order_debit') {
        current.balanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
        current.balanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      }
      if (tx.type === 'refund') {
        current.refundAmountMinor = Number(tx.amountMinor ?? 0)
        current.refundedAt = tx.createdAt
      }
      trail.set(key, current)
    }

    for (const item of history) {
      if (item.kind !== 'order') continue
      Object.assign(item, trail.get(item.id) ?? {})
    }

    return {
      items: history,
      total: history.length,
    }
  }

  if (!isMongoEnabled()) {
    return {
      items: [],
      total: 0,
    }
  }

  await connectDb()
  const objectId = new mongoose.Types.ObjectId(userId)

  const [orders, wallet] = await Promise.all([
    filter === 'wallet'
      ? []
      : await OrderModel.find({ userId: objectId })
          .select({ productName: 1, totalPriceMinor: 1, status: 1, fulfillMode: 1, createdAt: 1 })
          .sort({ createdAt: -1 })
          .limit(80)
          .lean(),
    filter === 'orders'
      ? []
      : await WalletTransactionModel.find({ userId: objectId })
          .select({ type: 1, amountMinor: 1, balanceAfterMinor: 1, note: 1, createdAt: 1 })
          .sort({ createdAt: -1 })
          .limit(80)
          .lean(),
  ])

  const history = [
    ...orders.map((order: any) => ({
      id: String(order._id),
      kind: 'order' as const,
      title: order.productName,
      sub: `${order.status} / ${order.fulfillMode}`,
      amountMinor: -Math.abs(order.totalPriceMinor ?? 0),
      createdAt: order.createdAt,
      balanceBeforeMinor: null as number | null,
      balanceAfterMinor: null as number | null,
      refundAmountMinor: null as number | null,
      refundedAt: null as Date | null,
    })),
    ...wallet.map((tx: any) => ({
      id: String(tx._id),
      kind: 'wallet' as const,
      title: tx.type,
      sub: tx.note || 'wallet activity',
      amountMinor: tx.amountMinor,
      createdAt: tx.createdAt,
      balanceBeforeMinor: null as number | null,
      balanceAfterMinor: Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0),
      balanceAfterMinorRaw: Number(tx.balanceAfterMinor ?? 0),
      refundAmountMinor: null as number | null,
      refundedAt: null as Date | null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const orderIds = orders.map((order: any) => String(order._id))
  if (orderIds.length > 0) {
    const orderTransactions = await WalletTransactionModel.find({
      referenceType: 'order',
      referenceId: { $in: orderIds },
      type: { $in: ['order_debit', 'refund'] },
    })
      .select({ type: 1, amountMinor: 1, balanceAfterMinor: 1, referenceId: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean()

    const trail = new Map<string, any>()
    for (const tx of orderTransactions as any[]) {
      const key = String(tx.referenceId)
      const current = trail.get(key) ?? {}
      if (tx.type === 'order_debit') {
        current.balanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
        current.balanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      }
      if (tx.type === 'refund') {
        current.refundAmountMinor = Number(tx.amountMinor ?? 0)
        current.refundedAt = tx.createdAt
      }
      trail.set(key, current)
    }

    for (const item of history) {
      if (item.kind !== 'order') continue
      Object.assign(item, trail.get(item.id) ?? {})
    }
  }

  return {
    items: history,
    total: history.length,
  }
}

export async function getSupportSnapshot(userId: string) {
  if (isSupabaseProvider()) {
    const [recentOrders, pendingDeposits] = await Promise.all([
      listSupabaseOrders().then((rows) =>
        rows
          .filter((row: any) => row.userId === userId)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6)
          .map((row: any) => ({
            productName: row.productName,
            status: row.status,
            createdAt: row.createdAt,
            failureCode: row.failureCode,
          })),
      ),
      listSupabaseDeposits(userId).then((rows) =>
        rows
          .filter((row: any) => row.status === 'pending')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6)
          .map((row: any) => ({
            amountMinor: row.amountMinor,
            createdAt: row.createdAt,
          })),
      ),
    ])

    return {
      recentOrders,
      pendingDeposits,
    }
  }

  if (!isMongoEnabled()) {
    return {
      recentOrders: [],
      pendingDeposits: [],
    }
  }

  await connectDb()
  const objectId = new mongoose.Types.ObjectId(userId)

  const [recentOrders, pendingDeposits] = await Promise.all([
    OrderModel.find({ userId: objectId })
      .select({ productName: 1, status: 1, createdAt: 1, failureCode: 1 })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    WalletDepositRequestModel.find({ userId: objectId, status: 'pending' })
      .select({ amountMinor: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ])

  return {
    recentOrders,
    pendingDeposits,
  }
}

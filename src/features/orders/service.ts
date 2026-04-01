import mongoose from 'mongoose'
import { ApiError } from '@/core/http'
import { toMinor } from '@/core/money'
import { connectDb } from '@/modules/db/connection'
import { getProviderAdapter } from '@/modules/providers/registry'
import { getOrderPricingSnapshot } from '@/modules/catalog/service'
import {
  ManualOrderAuditLogModel,
  ManualOrderModel,
  OrderAuditLogModel,
  OrderModel,
  ProductModel,
  ProductProviderLinkModel,
  UserModel,
  WalletTransactionModel,
} from '@/domain/models'

type AdminManualCreateStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

function mapManualCreateStatus(status: AdminManualCreateStatus) {
  if (status === 'completed') return { manualStatus: 'done' as const, orderStatus: 'completed' as const }
  if (status === 'cancelled') return { manualStatus: 'cancelled' as const, orderStatus: 'failed' as const }
  if (status === 'processing') return { manualStatus: 'processing' as const, orderStatus: 'processing' as const }
  return { manualStatus: 'pending' as const, orderStatus: 'manual_pending' as const }
}

export async function placeOrder(input: {
  userId: string
  productSlug: string
  account: string
  packageKey?: string
  countValue?: number
}) {
  await connectDb()

  const pricing = await getOrderPricingSnapshot({
    productSlug: input.productSlug,
    packageKey: input.packageKey,
    countValue: input.countValue,
  })

  if (!pricing || pricing.totalFinalPrice <= 0) {
    throw new ApiError(404, 'PRODUCT_NOT_AVAILABLE', 'Product unavailable')
  }

  const totalMinor = toMinor(pricing.totalFinalPrice)

  const session = await mongoose.startSession()

  try {
    let orderId = ''
    await session.withTransaction(async () => {
      const user = await UserModel.findById(input.userId).session(session)
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')
      if (user.walletBalanceMinor < totalMinor) throw new ApiError(400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance')

      user.walletBalanceMinor -= totalMinor
      await user.save({ session })

      const product = await ProductModel.findOne({ slug: input.productSlug }).session(session)
      if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

      const totalCostMinor = toMinor(pricing.totalRawCost)
      const profitMinor = totalMinor - totalCostMinor

      const order = await OrderModel.create(
        [
          {
            userId: user._id,
            productId: product._id,
            productName: product.name,
            productSlug: product.slug,
            packageKey: pricing.packageKey,
            countValue: pricing.kind === 'count' ? pricing.quantity : null,
            playerAccount: input.account,
            unitCostMinor: toMinor(pricing.unitRawCost),
            unitPriceMinor: toMinor(pricing.unitFinalPrice),
            totalCostMinor,
            totalPriceMinor: totalMinor,
            profitMinor,
            status: 'processing',
            fulfillMode: product.routingMode === 'manual_only' ? 'manual' : 'provider',
          },
        ],
        { session }
      )

      const created = order[0]
      orderId = String(created._id)

      await WalletTransactionModel.create(
        [
          {
            userId: user._id,
            type: 'order_debit',
            amountMinor: -totalMinor,
            balanceAfterMinor: user.walletBalanceMinor,
            referenceType: 'order',
            referenceId: orderId,
            note: `Order ${product.name}`,
          },
        ],
        { session }
      )

      await OrderAuditLogModel.create(
        [
          {
            orderId: created._id,
            action: 'ORDER_CREATED',
            actorType: 'customer',
            actorId: user._id,
            message: 'Order created and wallet deducted',
          },
        ],
        { session }
      )

      if (created.fulfillMode === 'manual') {
        created.status = 'manual_pending'
        await created.save({ session })
        await ManualOrderModel.create([{ orderId: created._id, status: 'pending', source: 'customer_queue' }], { session })
        await OrderAuditLogModel.create(
          [
            {
              orderId: created._id,
              action: 'MANUAL_QUEUE',
              actorType: 'system',
              message: 'Order queued for manual fulfillment',
            },
          ],
          { session }
        )
        return
      }

      const link = await ProductProviderLinkModel.findOne({
        productId: product._id,
        packageKey: pricing.packageKey,
        active: true,
      }).session(session)

      if (!link) {
        await refundOrder(created._id, user._id, totalMinor, user.walletBalanceMinor, session, 'PROVIDER_LINK_MISSING')
        return
      }

      try {
        const adapter = getProviderAdapter(link.provider)
        const providerResult = await adapter.placeOrder({
          providerProductId: link.providerProductId,
          providerVariantId: link.providerVariantId,
          account: input.account,
          amount: pricing.kind === 'count' ? pricing.quantity : undefined,
        })

        if (!providerResult.success) {
          await refundOrder(created._id, user._id, totalMinor, user.walletBalanceMinor, session, providerResult.errorCode ?? 'PROVIDER_FAILED')
          return
        }

        created.providerOrderRef = providerResult.providerRef ?? null
        const providerStatus = providerResult.providerRef
          ? await adapter.getOrderStatus(providerResult.providerRef).catch(() => null)
          : null

        if (providerStatus?.success && providerStatus.status === 'completed') {
          created.status = 'completed'
          await created.save({ session })

          await OrderAuditLogModel.create(
            [
              {
                orderId: created._id,
                action: 'PROVIDER_SUCCESS',
                actorType: 'system',
                message: 'تم تنفيذ الطلب بنجاح',
              },
            ],
            { session }
          )
          return
        }

        if (providerStatus?.success && providerStatus.status === 'cancelled') {
          await refundOrder(created._id, user._id, totalMinor, user.walletBalanceMinor, session, 'PROVIDER_CANCELLED')
          return
        }

        created.status = 'processing'
        await created.save({ session })

        await OrderAuditLogModel.create(
          [
            {
              orderId: created._id,
              action: 'PROVIDER_PENDING',
              actorType: 'system',
              message: 'الطلب قيد المعالجة',
            },
          ],
          { session }
        )
      } catch {
        await refundOrder(created._id, user._id, totalMinor, user.walletBalanceMinor, session, 'PROVIDER_EXCEPTION')
      }
    })

    return { orderId }
  } finally {
    await session.endSession()
  }
}

async function refundOrder(
  orderId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  totalMinor: number,
  currentBalance: number,
  session: mongoose.ClientSession,
  failureCode: string
) {
  const order = await OrderModel.findById(orderId).session(session)
  const user = await UserModel.findById(userId).session(session)
  if (!order || !user) return

  user.walletBalanceMinor += totalMinor
  await user.save({ session })

  order.status = 'refunded'
  order.failureCode = failureCode
  await order.save({ session })

  await WalletTransactionModel.create(
    [
      {
        userId,
        type: 'refund',
        amountMinor: totalMinor,
        balanceAfterMinor: currentBalance + totalMinor,
        referenceType: 'order',
        referenceId: String(orderId),
        note: 'Automatic refund',
      },
    ],
    { session }
  )

  await OrderAuditLogModel.create(
    [
      {
        orderId,
        action: 'ORDER_REFUNDED',
        actorType: 'system',
        message: `Order refunded: ${failureCode}`,
      },
    ],
    { session }
  )
}

async function syncProviderOrderStatus(orderId: string) {
  const order = await OrderModel.findById(orderId)
  if (!order || order.fulfillMode !== 'provider' || order.status !== 'processing' || !order.providerOrderRef) return

  const link = (await ProductProviderLinkModel.findOne({
    productId: order.productId,
    packageKey: order.packageKey ?? null,
    active: true,
  })
    .sort({ priority: 1, isPrimary: -1 })
    .lean()) as
    | {
        provider: string
      }
    | null

  if (!link) return

  const adapter = getProviderAdapter(link.provider)
  const providerStatus = await adapter.getOrderStatus(order.providerOrderRef).catch(() => null)
  if (!providerStatus?.success || !providerStatus.status || providerStatus.status === 'pending') return

  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      const currentOrder = await OrderModel.findById(orderId).session(session)
      if (!currentOrder || currentOrder.fulfillMode !== 'provider' || currentOrder.status !== 'processing') return

      if (providerStatus.status === 'completed') {
        currentOrder.status = 'completed'
        currentOrder.failureCode = null
        await currentOrder.save({ session })

        await OrderAuditLogModel.create(
          [
            {
              orderId: currentOrder._id,
              action: 'PROVIDER_STATUS_SYNC',
              actorType: 'system',
              message: 'تم تحديث الطلب إلى مكتمل',
            },
          ],
          { session }
        )
        return
      }

      const user = await UserModel.findById(currentOrder.userId).session(session)
      if (!user) return

      const alreadyRefunded = await WalletTransactionModel.findOne({
        referenceType: 'order',
        referenceId: String(currentOrder._id),
        type: 'refund',
      }).session(session)

      if (alreadyRefunded) {
        currentOrder.status = 'refunded'
        currentOrder.failureCode = currentOrder.failureCode ?? 'PROVIDER_CANCELLED'
        await currentOrder.save({ session })
        return
      }

      await refundOrder(
        currentOrder._id,
        user._id,
        currentOrder.totalPriceMinor,
        user.walletBalanceMinor,
        session,
        'PROVIDER_CANCELLED'
      )
    })
  } finally {
    await session.endSession()
  }
}

async function getWalletTrailByOrderIds(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, any>()

  const transactions = await WalletTransactionModel.find({
    referenceType: 'order',
    referenceId: { $in: orderIds },
    type: { $in: ['order_debit', 'refund'] },
  })
    .select({ type: 1, amountMinor: 1, balanceAfterMinor: 1, referenceId: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .lean()

  const trail = new Map<string, any>()

  for (const tx of transactions as any[]) {
    const orderId = String(tx.referenceId)
    const current = trail.get(orderId) ?? {}

    if (tx.type === 'order_debit') {
      current.balanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
      current.balanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      current.debitTransactionId = String(tx._id)
      current.debitedAt = tx.createdAt
    }

    if (tx.type === 'refund') {
      current.refundAmountMinor = Number(tx.amountMinor ?? 0)
      current.refundBalanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
      current.refundBalanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      current.refundTransactionId = String(tx._id)
      current.refundedAt = tx.createdAt
    }

    trail.set(orderId, current)
  }

  return trail
}

export async function getCustomerOrders(userId: string, page: number = 1, pageSize: number = 20) {
  await connectDb()

  const pendingProviderOrders = await OrderModel.find({
    userId,
    fulfillMode: 'provider',
    status: 'processing',
    providerOrderRef: { $ne: null },
  })
    .select({ _id: 1 })
    .lean()

  for (const order of pendingProviderOrders as Array<{ _id: unknown }>) {
    await syncProviderOrderStatus(String(order._id))
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize)
  const [items, total] = await Promise.all([
    OrderModel.find({ userId })
      .select({ productName: 1, totalPriceMinor: 1, status: 1, fulfillMode: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    OrderModel.countDocuments({ userId }),
  ])

  const trail = await getWalletTrailByOrderIds(items.map((item: any) => String(item._id)))

  return {
    items: items.map((item: any) => ({
      ...item,
      ...trail.get(String(item._id)),
    })),
    total,
    page,
    pageSize,
  }
}

export async function getOrderDetailForUser(orderId: string, userId: string) {
  await connectDb()

  await syncProviderOrderStatus(orderId)

  const order = await OrderModel.findOne({ _id: orderId, userId })
    .select({
      productName: 1,
      productSlug: 1,
      packageKey: 1,
      countValue: 1,
      totalPriceMinor: 1,
      status: 1,
      fulfillMode: 1,
      createdAt: 1,
      updatedAt: 1,
      playerAccount: 1,
    })
    .lean()

  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const audits = await OrderAuditLogModel.find({ orderId })
    .select({ action: 1, actorType: 1, message: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .lean()

  const trail = await getWalletTrailByOrderIds([String(orderId)])

  return {
    order: {
      ...order,
      ...trail.get(String(orderId)),
    },
    audits,
  }
}

export async function getOrdersForAdmin(filters: { status?: string; from?: Date; to?: Date; page?: number; pageSize?: number }) {
  await connectDb()

  const pendingProviderOrders = await OrderModel.find({
    fulfillMode: 'provider',
    status: 'processing',
    providerOrderRef: { $ne: null },
  })
    .select({ _id: 1 })
    .lean()

  for (const order of pendingProviderOrders as Array<{ _id: unknown }>) {
    await syncProviderOrderStatus(String(order._id))
  }

  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 30))
  const skip = (page - 1) * pageSize

  const query: Record<string, unknown> = {}
  if (filters.status) query.status = filters.status
  if (filters.from || filters.to) {
    query.createdAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    }
  }

  const [items, total] = await Promise.all([
    OrderModel.find(query)
      .select({
        productName: 1,
        totalPriceMinor: 1,
        totalCostMinor: 1,
        profitMinor: 1,
        status: 1,
        fulfillMode: 1,
        createdAt: 1,
        userId: 1,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    OrderModel.countDocuments(query),
  ])

  const trail = await getWalletTrailByOrderIds(items.map((item: any) => String(item._id)))

  return {
    items: items.map((item: any) => ({
      ...item,
      ...trail.get(String(item._id)),
    })),
    total,
    page,
    pageSize,
  }
}

export async function updateOrderDecisionByAdmin(input: { orderId: string; adminId: string; action: 'accept' | 'reject' }) {
  await connectDb()

  const session = await mongoose.startSession()

  try {
    let result: { id: string; status: string } | null = null

    await session.withTransaction(async () => {
      const order = await OrderModel.findById(input.orderId).session(session)
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

      if (!['processing', 'manual_pending'].includes(order.status)) {
        throw new ApiError(409, 'ORDER_FINAL_STATE', 'Order can no longer be changed')
      }

      if (input.action === 'accept') {
        order.status = 'completed'
        await order.save({ session })

        if (order.fulfillMode === 'manual') {
          await ManualOrderModel.findOneAndUpdate(
            { orderId: order._id },
            { status: 'done', note: 'Accepted from admin orders' },
            { session }
          )
        }

        await OrderAuditLogModel.create(
          [
            {
              orderId: order._id,
              action: 'ADMIN_ACCEPT',
              actorType: 'admin',
              actorId: new mongoose.Types.ObjectId(input.adminId),
              message: 'Admin accepted the order',
            },
          ],
          { session }
        )

        result = { id: String(order._id), status: order.status }
        return
      }

      if (order.fulfillMode === 'manual') {
        const manual = await ManualOrderModel.findOne({ orderId: order._id }).session(session)

        if (manual?.source === 'admin_local') {
          order.status = 'failed'
          order.failureCode = 'ADMIN_MANUAL_CANCELLED'
          await order.save({ session })

          await ManualOrderModel.findOneAndUpdate(
            { orderId: order._id },
            { status: 'cancelled', note: 'Rejected from admin orders' },
            { session }
          )

          await OrderAuditLogModel.create(
            [
              {
                orderId: order._id,
                action: 'ADMIN_REJECT',
                actorType: 'admin',
                actorId: new mongoose.Types.ObjectId(input.adminId),
                message: 'Admin rejected a local manual order',
              },
            ],
            { session }
          )

          result = { id: String(order._id), status: order.status }
          return
        }
      }

      const user = await UserModel.findById(order.userId).session(session)
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

      user.walletBalanceMinor += order.totalPriceMinor
      await user.save({ session })

      order.status = 'refunded'
      order.failureCode = 'ADMIN_REJECTED'
      await order.save({ session })

      await WalletTransactionModel.create(
        [
          {
            userId: order.userId,
            type: 'refund',
            amountMinor: order.totalPriceMinor,
            balanceAfterMinor: user.walletBalanceMinor,
            referenceType: 'order',
            referenceId: String(order._id),
            note: 'Admin rejected order',
          },
        ],
        { session }
      )

      if (order.fulfillMode === 'manual') {
        await ManualOrderModel.findOneAndUpdate({ orderId: order._id }, { status: 'cancelled', note: 'Rejected from admin orders' }, { session })
      }

      await OrderAuditLogModel.create(
        [
          {
            orderId: order._id,
            action: 'ADMIN_REJECT',
            actorType: 'admin',
            actorId: new mongoose.Types.ObjectId(input.adminId),
            message: 'Admin rejected the order and refunded the wallet',
          },
        ],
        { session }
      )

      result = { id: String(order._id), status: order.status }
    })

    if (!result) throw new ApiError(500, 'ORDER_UPDATE_FAILED', 'Order update failed')
    return result
  } finally {
    await session.endSession()
  }
}

export async function getManualOrdersForAdmin() {
  await connectDb()

  const manualItems = await ManualOrderModel.find({})
    .select({ orderId: 1, assignedAdminId: 1, createdByAdminId: 1, source: 1, note: 1, status: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean()

  const orderIds = manualItems.map((item: any) => item.orderId).filter(Boolean)
  const orders = await OrderModel.find({ _id: { $in: orderIds } })
    .select({
      productId: 1,
      productName: 1,
      productSlug: 1,
      packageKey: 1,
      countValue: 1,
      playerAccount: 1,
      totalCostMinor: 1,
      totalPriceMinor: 1,
      profitMinor: 1,
      status: 1,
      fulfillMode: 1,
      userId: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .lean()

  const userIds = orders.map((order: any) => order.userId).filter(Boolean)
  const users = await UserModel.find({ _id: { $in: userIds } }).select({ name: 1, email: 1 }).lean()

  const orderMap = new Map(orders.map((order: any) => [String(order._id), order]))
  const userMap = new Map(users.map((user: any) => [String(user._id), user]))

  return manualItems
    .map((item: any) => {
      const order = orderMap.get(String(item.orderId))
      if (!order) return null

      const user = userMap.get(String(order.userId))
      const profitPercent = order.totalCostMinor > 0 ? (order.profitMinor / order.totalCostMinor) * 100 : 0

      return {
        _id: String(item._id),
        orderId: String(order._id),
        source: item.source ?? 'customer_queue',
        manualStatus: item.status,
        orderStatus: order.status,
        note: item.note ?? '',
        assignedAdminId: item.assignedAdminId ? String(item.assignedAdminId) : null,
        createdByAdminId: item.createdByAdminId ? String(item.createdByAdminId) : null,
        productName: order.productName,
        productSlug: order.productSlug,
        packageKey: order.packageKey ?? null,
        countValue: order.countValue ?? null,
        playerAccount: order.playerAccount,
        totalCostMinor: order.totalCostMinor,
        totalPriceMinor: order.totalPriceMinor,
        profitMinor: order.profitMinor,
        profitPercent,
        fulfillMode: order.fulfillMode,
        userId: String(order.userId),
        userName: user?.name ?? 'Unknown user',
        userEmail: user?.email ?? '',
        createdAt: new Date(item.createdAt ?? order.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt ?? order.updatedAt).toISOString(),
      }
    })
    .filter(Boolean)
}

export async function createManualOrderByAdmin(input: {
  adminId: string
  userId: string
  productId: string
  playerAccount: string
  packageKey?: string
  countValue?: number
  purchaseAmount: number
  saleAmount: number
  status: AdminManualCreateStatus
  note?: string
}) {
  await connectDb()
  const session = await mongoose.startSession()

  try {
    let result: { manualOrderId: string; orderId: string; status: string } | null = null

    await session.withTransaction(async () => {
      const user = await UserModel.findById(input.userId).session(session)
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

      const product = await ProductModel.findById(input.productId).session(session)
      if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

      let packageKey: string | null = null
      let countValue: number | null = null

      if (product.kind === 'package') {
        const selectedPackage = product.packages.find((item: any) => item.key === input.packageKey)
        if (!selectedPackage) throw new ApiError(400, 'PACKAGE_REQUIRED', 'Package selection is required')
        packageKey = selectedPackage.key
      }

      if (product.kind === 'count') {
        const normalizedCount = Math.max(1, Math.floor(input.countValue ?? 0))
        if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) {
          throw new ApiError(400, 'COUNT_REQUIRED', 'Valid count is required')
        }
        countValue = normalizedCount
      }

      const totalCostMinor = toMinor(input.purchaseAmount)
      const totalPriceMinor = toMinor(input.saleAmount)
      const profitMinor = totalPriceMinor - totalCostMinor
      const divisor = countValue && countValue > 0 ? countValue : 1
      const mappedStatus = mapManualCreateStatus(input.status)

      const order = await OrderModel.create(
        [
          {
            userId: user._id,
            productId: product._id,
            productName: product.name,
            productSlug: product.slug,
            packageKey,
            countValue,
            playerAccount: input.playerAccount.trim(),
            unitCostMinor: Math.round(totalCostMinor / divisor),
            unitPriceMinor: Math.round(totalPriceMinor / divisor),
            totalCostMinor,
            totalPriceMinor,
            profitMinor,
            status: mappedStatus.orderStatus,
            fulfillMode: 'manual',
            providerOrderRef: null,
            failureCode: mappedStatus.orderStatus === 'failed' ? 'ADMIN_MANUAL_CANCELLED' : null,
          },
        ],
        { session }
      )

      const createdOrder = order[0]

      const manualOrder = await ManualOrderModel.create(
        [
          {
            orderId: createdOrder._id,
            assignedAdminId: new mongoose.Types.ObjectId(input.adminId),
            createdByAdminId: new mongoose.Types.ObjectId(input.adminId),
            source: 'admin_local',
            note: input.note ?? '',
            status: mappedStatus.manualStatus,
          },
        ],
        { session }
      )

      const createdManual = manualOrder[0]

      await ManualOrderAuditLogModel.create(
        [
          {
            manualOrderId: createdManual._id,
            adminId: new mongoose.Types.ObjectId(input.adminId),
            action: 'CREATE',
            note: `Admin local order created with status ${input.status}${input.note ? ` - ${input.note}` : ''}`,
          },
        ],
        { session }
      )

      await OrderAuditLogModel.create(
        [
          {
            orderId: createdOrder._id,
            action: 'ADMIN_MANUAL_CREATE',
            actorType: 'admin',
            actorId: new mongoose.Types.ObjectId(input.adminId),
            message: 'Admin created a manual/local order',
            payload: {
              source: 'admin_local',
              purchaseAmount: input.purchaseAmount,
              saleAmount: input.saleAmount,
              countValue,
              packageKey,
            },
          },
        ],
        { session }
      )

      result = {
        manualOrderId: String(createdManual._id),
        orderId: String(createdOrder._id),
        status: createdManual.status,
      }
    })

    if (!result) throw new ApiError(500, 'MANUAL_ORDER_CREATE_FAILED', 'Manual order creation failed')
    return result
  } finally {
    await session.endSession()
  }
}

export async function updateManualOrderStatusByAdmin(input: {
  manualOrderId: string
  adminId: string
  status: 'pending' | 'processing' | 'done' | 'cancelled'
  note?: string
}) {
  await connectDb()
  const session = await mongoose.startSession()

  try {
    let result: { id: string; status: string } | null = null

    await session.withTransaction(async () => {
      const manual = await ManualOrderModel.findById(input.manualOrderId).session(session)
      if (!manual) throw new ApiError(404, 'MANUAL_ORDER_NOT_FOUND', 'Manual order not found')

      const order = await OrderModel.findById(manual.orderId).session(session)
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

      if (!['manual_pending', 'processing'].includes(order.status)) {
        throw new ApiError(409, 'ORDER_FINAL_STATE', 'Order can no longer be changed')
      }

      manual.assignedAdminId = new mongoose.Types.ObjectId(input.adminId)
      manual.status = input.status
      manual.note = input.note ?? ''
      await manual.save({ session })

      await ManualOrderAuditLogModel.create(
        {
          manualOrderId: manual._id,
          adminId: new mongoose.Types.ObjectId(input.adminId),
          action: 'STATUS_UPDATE',
          note: `Updated to ${input.status}${input.note ? ` - ${input.note}` : ''}`,
        },
        { session }
      )

      if (input.status === 'done') {
        order.status = 'completed'
        await order.save({ session })
      } else if (input.status === 'cancelled') {
        if (manual.source === 'admin_local') {
          order.status = 'failed'
          order.failureCode = 'ADMIN_MANUAL_CANCELLED'
          await order.save({ session })
        } else {
        const user = await UserModel.findById(order.userId).session(session)
        if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

        user.walletBalanceMinor += order.totalPriceMinor
        await user.save({ session })

        order.status = 'refunded'
        order.failureCode = 'MANUAL_ORDER_CANCELLED'
        await order.save({ session })

        await WalletTransactionModel.create(
          [
            {
              userId: order.userId,
              type: 'refund',
              amountMinor: order.totalPriceMinor,
              balanceAfterMinor: user.walletBalanceMinor,
              referenceType: 'order',
              referenceId: String(order._id),
              note: 'Manual order cancelled',
            },
          ],
          { session }
        )
        }
      } else {
        order.status = input.status === 'processing' ? 'processing' : 'manual_pending'
        await order.save({ session })
      }

      await OrderAuditLogModel.create(
        {
          orderId: manual.orderId,
          action: 'MANUAL_STATUS_UPDATE',
          actorType: 'admin',
          actorId: new mongoose.Types.ObjectId(input.adminId),
          message: `Manual order updated to ${input.status}`,
        },
        { session }
      )

      result = { id: String(manual._id), status: manual.status }
    })

    if (!result) throw new ApiError(500, 'MANUAL_ORDER_UPDATE_FAILED', 'Manual order update failed')
    return result
  } finally {
    await session.endSession()
  }
}

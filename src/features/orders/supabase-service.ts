import { ApiError } from '@/core/http'
import { toMinor } from '@/core/money'
import { getOrderPricingSnapshot } from '@/modules/catalog/service'
import { getProviderAdapter } from '@/modules/providers/registry'
import { getSupabaseProductById, getSupabaseProductBySlug, listSupabaseProviderLinks } from '@/modules/supabase/catalog-store'
import {
  createSupabaseManualOrderAudit,
  createSupabaseOrderAudit,
  getSupabaseManualOrderById,
  createSupabaseWalletTransaction,
  getSupabaseOrderById,
  getSupabaseUserRecord,
  listSupabaseManualOrders,
  listSupabaseOrderAudits,
  listSupabaseOrders,
  listSupabaseUsers,
  listSupabaseWalletTransactions,
  saveSupabaseManualOrder,
  saveSupabaseOrder,
  saveSupabaseUserWalletBalance,
} from '@/modules/supabase/commerce-store'

type AdminManualCreateStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

function mapManualCreateStatus(status: AdminManualCreateStatus) {
  if (status === 'completed') return { manualStatus: 'done' as const, orderStatus: 'completed' as const }
  if (status === 'cancelled') return { manualStatus: 'cancelled' as const, orderStatus: 'failed' as const }
  if (status === 'processing') return { manualStatus: 'processing' as const, orderStatus: 'processing' as const }
  return { manualStatus: 'pending' as const, orderStatus: 'manual_pending' as const }
}

function selectProviderLink(links: any[]) {
  const enabled = links.filter((link: any) => (link.enabled ?? link.active ?? true) !== false)
  const forced = enabled.find((link: any) => link.forceProvider)
  if (forced) return forced
  return [...enabled].sort((a: any, b: any) => {
    const priorityA = a.priority ?? 100
    const priorityB = b.priority ?? 100
    if (priorityA !== priorityB) return priorityA - priorityB
    return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))
  })[0]
}

async function refundSupabaseOrder(
  orderId: string,
  userId: string,
  totalMinor: number,
  failureCode: string,
  note: string,
) {
  const [order, user] = await Promise.all([getSupabaseOrderById(orderId), getSupabaseUserRecord(userId)])
  if (!order || !user) return

  const nextBalance = user.walletBalanceMinor + totalMinor
  await saveSupabaseUserWalletBalance(user, nextBalance)

  await saveSupabaseOrder({
    id: order._id,
    userId: order.userId,
    status: 'refunded',
    payload: {
      ...order.raw.payload,
      failureCode,
      providerOrderRef: order.providerOrderRef,
      updatedAt: new Date().toISOString(),
      createdAt: order.createdAt,
    },
  })

  await createSupabaseWalletTransaction({
    userId: user.userId,
    type: 'refund',
    amountMinor: totalMinor,
    balanceAfterMinor: nextBalance,
    referenceType: 'order',
    referenceId: orderId,
    note,
  })

  await createSupabaseOrderAudit({
    orderId,
    action: 'ORDER_REFUNDED',
    actorType: 'system',
    message: `Order refunded: ${failureCode}`,
  })
}

async function syncSupabaseProviderOrderStatus(orderId: string) {
  const order = await getSupabaseOrderById(orderId)
  if (!order || order.fulfillMode !== 'provider' || order.status !== 'processing' || !order.providerOrderRef) return

  const links = (await listSupabaseProviderLinks()).filter(
    (link: any) => String(link.productId) === String(order.productId) && (link.packageKey ?? null) === (order.packageKey ?? null) && (link.active ?? true),
  )
  const link = selectProviderLink(links)
  if (!link) return

  const adapter = getProviderAdapter(link.provider)
  const providerStatus = await adapter.getOrderStatus(order.providerOrderRef).catch(() => null)
  if (!providerStatus?.success || !providerStatus.status || providerStatus.status === 'pending') return

  if (providerStatus.status === 'completed') {
    await saveSupabaseOrder({
      id: order._id,
      userId: order.userId,
      status: 'completed',
      payload: {
        ...order.raw.payload,
        failureCode: null,
        providerOrderRef: order.providerOrderRef,
        updatedAt: new Date().toISOString(),
        createdAt: order.createdAt,
      },
    })

    await createSupabaseOrderAudit({
      orderId: order._id,
      action: 'PROVIDER_STATUS_SYNC',
      actorType: 'system',
      message: 'تم تحديث الطلب إلى مكتمل',
    })
    return
  }

  await refundSupabaseOrder(order._id, order.userId, order.totalPriceMinor, 'PROVIDER_CANCELLED', 'Automatic refund')
}

async function getSupabaseWalletTrailByOrderIds(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, any>()

  const transactions = (await listSupabaseWalletTransactions()).filter(
    (tx: any) => tx.referenceType === 'order' && tx.referenceId && orderIds.includes(tx.referenceId) && ['order_debit', 'refund'].includes(tx.type),
  )

  const trail = new Map<string, any>()

  for (const tx of transactions.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    const orderId = String(tx.referenceId)
    const current = trail.get(orderId) ?? {}

    if (tx.type === 'order_debit') {
      current.balanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
      current.balanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      current.debitTransactionId = tx._id
      current.debitedAt = tx.createdAt
    }

    if (tx.type === 'refund') {
      current.refundAmountMinor = Number(tx.amountMinor ?? 0)
      current.refundBalanceBeforeMinor = Number(tx.balanceAfterMinor ?? 0) - Number(tx.amountMinor ?? 0)
      current.refundBalanceAfterMinor = Number(tx.balanceAfterMinor ?? 0)
      current.refundTransactionId = tx._id
      current.refundedAt = tx.createdAt
    }

    trail.set(orderId, current)
  }

  return trail
}

export async function placeOrderSupabase(input: {
  userId: string
  productSlug: string
  account: string
  packageKey?: string
  countValue?: number
}) {
  const pricing = await getOrderPricingSnapshot({
    productSlug: input.productSlug,
    packageKey: input.packageKey,
    countValue: input.countValue,
  })

  if (!pricing || pricing.totalFinalPrice <= 0) {
    throw new ApiError(404, 'PRODUCT_NOT_AVAILABLE', 'Product unavailable')
  }

  const user = await getSupabaseUserRecord(input.userId)
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

  const totalMinor = toMinor(pricing.totalFinalPrice)
  if (user.walletBalanceMinor < totalMinor) throw new ApiError(400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance')

  const product = await getSupabaseProductBySlug(input.productSlug)
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const totalCostMinor = toMinor(pricing.totalRawCost)
  const profitMinor = totalMinor - totalCostMinor
  const fulfillMode = product.routingMode === 'manual_only' ? 'manual' : 'provider'
  const initialStatus = fulfillMode === 'manual' ? 'manual_pending' : 'processing'

  const nextBalance = user.walletBalanceMinor - totalMinor
  await saveSupabaseUserWalletBalance(user, nextBalance)

  const order = await saveSupabaseOrder({
    userId: user.userId,
    status: initialStatus,
    payload: {
      productId: String(product._id),
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
      fulfillMode,
      providerOrderRef: null,
      failureCode: null,
    },
  })

  await createSupabaseWalletTransaction({
    userId: user.userId,
    type: 'order_debit',
    amountMinor: -totalMinor,
    balanceAfterMinor: nextBalance,
    referenceType: 'order',
    referenceId: order.id,
    note: `Order ${product.name}`,
  })

  await createSupabaseOrderAudit({
    orderId: order.id,
    action: 'ORDER_CREATED',
    actorType: 'customer',
    actorId: user.userId,
    message: 'Order created and wallet deducted',
  })

  if (fulfillMode === 'manual') {
    await saveSupabaseManualOrder({
      orderId: order.id,
      status: 'pending',
      payload: {
        source: 'customer_queue',
        note: '',
        assignedAdminId: null,
        createdByAdminId: null,
      },
    })

    await createSupabaseOrderAudit({
      orderId: order.id,
      action: 'MANUAL_QUEUE',
      actorType: 'system',
      message: 'Order queued for manual fulfillment',
    })

    return { orderId: order.id }
  }

  const links = (await listSupabaseProviderLinks()).filter(
    (link: any) => String(link.productId) === String(product._id) && (link.packageKey ?? null) === (pricing.packageKey ?? null) && (link.active ?? true),
  )
  const link = selectProviderLink(links)

  if (!link) {
    await refundSupabaseOrder(order.id, user.userId, totalMinor, 'PROVIDER_LINK_MISSING', 'Automatic refund')
    return { orderId: order.id }
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
      await refundSupabaseOrder(order.id, user.userId, totalMinor, providerResult.errorCode ?? 'PROVIDER_FAILED', 'Automatic refund')
      return { orderId: order.id }
    }

    const providerRef = providerResult.providerRef ?? null
    const providerStatus = providerRef ? await adapter.getOrderStatus(providerRef).catch(() => null) : null

    if (providerStatus?.success && providerStatus.status === 'completed') {
      await saveSupabaseOrder({
        id: order.id,
        userId: user.userId,
        status: 'completed',
        payload: {
          ...order.payload,
          providerOrderRef: providerRef,
          failureCode: null,
          createdAt: order.created_at,
        },
      })

      await createSupabaseOrderAudit({
        orderId: order.id,
        action: 'PROVIDER_SUCCESS',
        actorType: 'system',
        message: 'تم تنفيذ الطلب بنجاح',
      })

      return { orderId: order.id }
    }

    if (providerStatus?.success && providerStatus.status === 'cancelled') {
      await refundSupabaseOrder(order.id, user.userId, totalMinor, 'PROVIDER_CANCELLED', 'Automatic refund')
      return { orderId: order.id }
    }

    await saveSupabaseOrder({
      id: order.id,
      userId: user.userId,
      status: 'processing',
      payload: {
        ...order.payload,
        providerOrderRef: providerRef,
        failureCode: null,
        createdAt: order.created_at,
      },
    })

    await createSupabaseOrderAudit({
      orderId: order.id,
      action: 'PROVIDER_PENDING',
      actorType: 'system',
      message: 'الطلب قيد المعالجة',
    })
  } catch {
    await refundSupabaseOrder(order.id, user.userId, totalMinor, 'PROVIDER_EXCEPTION', 'Automatic refund')
  }

  return { orderId: order.id }
}

export async function getCustomerOrdersSupabase(userId: string, page: number = 1, pageSize: number = 20) {
  const pendingProviderOrders = (await listSupabaseOrders()).filter(
    (order: any) => order.userId === userId && order.fulfillMode === 'provider' && order.status === 'processing' && order.providerOrderRef,
  )
  for (const order of pendingProviderOrders) {
    await syncSupabaseProviderOrderStatus(order._id)
  }

  const itemsAll = (await listSupabaseOrders())
    .filter((order: any) => order.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize)
  const items = itemsAll.slice(skip, skip + pageSize)
  const trail = await getSupabaseWalletTrailByOrderIds(items.map((item: any) => item._id))

  return {
    items: items.map((item: any) => ({
      ...item,
      ...trail.get(item._id),
    })),
    total: itemsAll.length,
    page,
    pageSize,
  }
}

export async function getOrderDetailForUserSupabase(orderId: string, userId: string) {
  await syncSupabaseProviderOrderStatus(orderId)

  const order = await getSupabaseOrderById(orderId)
  if (!order || order.userId !== userId) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const audits = await listSupabaseOrderAudits(orderId)
  const trail = await getSupabaseWalletTrailByOrderIds([orderId])

  return {
    order: {
      ...order,
      ...trail.get(orderId),
    },
    audits,
  }
}

export async function getOrdersForAdminSupabase(filters: { status?: string; from?: Date; to?: Date; page?: number; pageSize?: number }) {
  const pendingProviderOrders = (await listSupabaseOrders()).filter(
    (order: any) => order.fulfillMode === 'provider' && order.status === 'processing' && order.providerOrderRef,
  )
  for (const order of pendingProviderOrders) {
    await syncSupabaseProviderOrderStatus(order._id)
  }

  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 30))
  const skip = (page - 1) * pageSize

  const itemsAll = (await listSupabaseOrders())
    .filter((order: any) => !filters.status || order.status === filters.status)
    .filter((order: any) => !filters.from || new Date(order.createdAt) >= filters.from!)
    .filter((order: any) => !filters.to || new Date(order.createdAt) <= filters.to!)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const items = itemsAll.slice(skip, skip + pageSize)
  const trail = await getSupabaseWalletTrailByOrderIds(items.map((item: any) => item._id))

  return {
    items: items.map((item: any) => ({
      ...item,
      ...trail.get(item._id),
    })),
    total: itemsAll.length,
    page,
    pageSize,
  }
}

export async function updateOrderDecisionByAdminSupabase(input: { orderId: string; adminId: string; action: 'accept' | 'reject' }) {
  const order = await getSupabaseOrderById(input.orderId)
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

  if (!['processing', 'manual_pending'].includes(order.status)) {
    throw new ApiError(409, 'ORDER_FINAL_STATE', 'Order can no longer be changed')
  }

  if (input.action === 'accept') {
    await saveSupabaseOrder({
      id: order._id,
      userId: order.userId,
      status: 'completed',
      payload: {
        ...order.raw.payload,
        failureCode: null,
        createdAt: order.createdAt,
      },
    })

    const manual = (await listSupabaseManualOrders()).find((item: any) => item.orderId === order._id)
    if (manual) {
      await saveSupabaseManualOrder({
        id: manual._id,
        orderId: order._id,
        status: 'done',
        payload: {
          ...manual.raw.payload,
          note: 'Accepted from admin orders',
          createdAt: manual.createdAt,
        },
      })
    }

    await createSupabaseOrderAudit({
      orderId: order._id,
      action: 'ADMIN_ACCEPT',
      actorType: 'admin',
      actorId: input.adminId,
      message: 'Admin accepted the order',
    })

    return { id: order._id, status: 'completed' }
  }

  const manual = (await listSupabaseManualOrders()).find((item: any) => item.orderId === order._id)
  if (order.fulfillMode === 'manual' && manual?.source === 'admin_local') {
    await saveSupabaseOrder({
      id: order._id,
      userId: order.userId,
      status: 'failed',
      payload: {
        ...order.raw.payload,
        failureCode: 'ADMIN_MANUAL_CANCELLED',
        createdAt: order.createdAt,
      },
    })

    if (manual) {
      await saveSupabaseManualOrder({
        id: manual._id,
        orderId: order._id,
        status: 'cancelled',
        payload: {
          ...manual.raw.payload,
          note: 'Rejected from admin orders',
          createdAt: manual.createdAt,
        },
      })
    }

    await createSupabaseOrderAudit({
      orderId: order._id,
      action: 'ADMIN_REJECT',
      actorType: 'admin',
      actorId: input.adminId,
      message: 'Admin rejected a local manual order',
    })

    return { id: order._id, status: 'failed' }
  }

  const user = await getSupabaseUserRecord(order.userId)
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

  const nextBalance = user.walletBalanceMinor + order.totalPriceMinor
  await saveSupabaseUserWalletBalance(user, nextBalance)

  await saveSupabaseOrder({
    id: order._id,
    userId: order.userId,
    status: 'refunded',
    payload: {
      ...order.raw.payload,
      failureCode: 'ADMIN_REJECTED',
      createdAt: order.createdAt,
    },
  })

  await createSupabaseWalletTransaction({
    userId: order.userId,
    type: 'refund',
    amountMinor: order.totalPriceMinor,
    balanceAfterMinor: nextBalance,
    referenceType: 'order',
    referenceId: order._id,
    note: 'Admin rejected order',
  })

  if (manual) {
    await saveSupabaseManualOrder({
      id: manual._id,
      orderId: order._id,
      status: 'cancelled',
      payload: {
        ...manual.raw.payload,
        note: 'Rejected from admin orders',
        createdAt: manual.createdAt,
      },
    })
  }

  await createSupabaseOrderAudit({
    orderId: order._id,
    action: 'ADMIN_REJECT',
    actorType: 'admin',
    actorId: input.adminId,
    message: 'Admin rejected the order and refunded the wallet',
  })

  return { id: order._id, status: 'refunded' }
}

export async function getManualOrdersForAdminSupabase() {
  const [manualItems, orders, users] = await Promise.all([listSupabaseManualOrders(), listSupabaseOrders(), listSupabaseUsers()])

  const orderMap = new Map<string, any>(orders.map((order: any) => [order._id, order]))
  const userMap = new Map<string, any>(users.map((user: any) => [user.userId, user]))

  return manualItems
    .map((item: any) => {
      const order = orderMap.get(item.orderId)
      if (!order) return null

      const user = userMap.get(order.userId)
      const profitPercent = order.totalCostMinor > 0 ? (order.profitMinor / order.totalCostMinor) * 100 : 0

      return {
        _id: item._id,
        orderId: order._id,
        source: item.source ?? 'customer_queue',
        manualStatus: item.status,
        orderStatus: order.status,
        note: item.note ?? '',
        assignedAdminId: item.assignedAdminId,
        createdByAdminId: item.createdByAdminId,
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
        userId: order.userId,
        userName: user?.name ?? 'Unknown user',
        userEmail: user?.email ?? '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    })
    .filter(Boolean) as any[]
}

export async function createManualOrderByAdminSupabase(input: {
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
  const user = await getSupabaseUserRecord(input.userId)
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

  const product = await getSupabaseProductById(input.productId)
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

  const order = await saveSupabaseOrder({
    userId: user.userId,
    status: mappedStatus.orderStatus,
    payload: {
      productId: String(product._id),
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
      fulfillMode: 'manual',
      providerOrderRef: null,
      failureCode: mappedStatus.orderStatus === 'failed' ? 'ADMIN_MANUAL_CANCELLED' : null,
    },
  })

  const manualOrder = await saveSupabaseManualOrder({
    orderId: order.id,
    status: mappedStatus.manualStatus,
    payload: {
      assignedAdminId: input.adminId,
      createdByAdminId: input.adminId,
      source: 'admin_local',
      note: input.note ?? '',
    },
  })

  await createSupabaseManualOrderAudit({
    manualOrderId: manualOrder.id,
    adminId: input.adminId,
    action: 'CREATE',
    note: `Admin local order created with status ${input.status}${input.note ? ` - ${input.note}` : ''}`,
  })

  await createSupabaseOrderAudit({
    orderId: order.id,
    action: 'ADMIN_MANUAL_CREATE',
    actorType: 'admin',
    actorId: input.adminId,
    message: 'Admin created a manual/local order',
    payload: {
      source: 'admin_local',
      purchaseAmount: input.purchaseAmount,
      saleAmount: input.saleAmount,
      countValue,
      packageKey,
    },
  })

  return {
    manualOrderId: manualOrder.id,
    orderId: order.id,
    status: mappedStatus.manualStatus,
  }
}

export async function updateManualOrderStatusByAdminSupabase(input: {
  manualOrderId: string
  adminId: string
  status: 'pending' | 'processing' | 'done' | 'cancelled'
  note?: string
}) {
  const manual = await getSupabaseManualOrderById(input.manualOrderId)
  if (!manual) throw new ApiError(404, 'MANUAL_ORDER_NOT_FOUND', 'Manual order not found')

  const order = await getSupabaseOrderById(manual.orderId)
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found')

  if (!['manual_pending', 'processing'].includes(order.status)) {
    throw new ApiError(409, 'ORDER_FINAL_STATE', 'Order can no longer be changed')
  }

  await saveSupabaseManualOrder({
    id: manual._id,
    orderId: manual.orderId,
    status: input.status,
    payload: {
      ...manual.raw.payload,
      assignedAdminId: input.adminId,
      note: input.note ?? '',
      createdAt: manual.createdAt,
    },
  })

  await createSupabaseManualOrderAudit({
    manualOrderId: manual._id,
    adminId: input.adminId,
    action: 'STATUS_UPDATE',
    note: `Updated to ${input.status}${input.note ? ` - ${input.note}` : ''}`,
  })

  if (input.status === 'done') {
    await saveSupabaseOrder({
      id: order._id,
      userId: order.userId,
      status: 'completed',
      payload: {
        ...order.raw.payload,
        createdAt: order.createdAt,
      },
    })
  } else if (input.status === 'cancelled') {
    if (manual.source === 'admin_local') {
      await saveSupabaseOrder({
        id: order._id,
        userId: order.userId,
        status: 'failed',
        payload: {
          ...order.raw.payload,
          failureCode: 'ADMIN_MANUAL_CANCELLED',
          createdAt: order.createdAt,
        },
      })
    } else {
      const user = await getSupabaseUserRecord(order.userId)
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

      const nextBalance = user.walletBalanceMinor + order.totalPriceMinor
      await saveSupabaseUserWalletBalance(user, nextBalance)

      await saveSupabaseOrder({
        id: order._id,
        userId: order.userId,
        status: 'refunded',
        payload: {
          ...order.raw.payload,
          failureCode: 'MANUAL_ORDER_CANCELLED',
          createdAt: order.createdAt,
        },
      })

      await createSupabaseWalletTransaction({
        userId: order.userId,
        type: 'refund',
        amountMinor: order.totalPriceMinor,
        balanceAfterMinor: nextBalance,
        referenceType: 'order',
        referenceId: order._id,
        note: 'Manual order cancelled',
      })
    }
  } else {
    await saveSupabaseOrder({
      id: order._id,
      userId: order.userId,
      status: input.status === 'processing' ? 'processing' : 'manual_pending',
      payload: {
        ...order.raw.payload,
        createdAt: order.createdAt,
      },
    })
  }

  await createSupabaseOrderAudit({
    orderId: manual.orderId,
    action: 'MANUAL_STATUS_UPDATE',
    actorType: 'admin',
    actorId: input.adminId,
    message: `Manual order updated to ${input.status}`,
  })

  return { id: manual._id, status: input.status }
}

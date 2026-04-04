import { getDocumentById, getDocumentByUserId, queryDocuments, writeDocument } from './documents'

export type SupabaseUserRecord = {
  id: string
  userId: string
  email: string
  name: string
  role: 'customer' | 'admin'
  isActive: boolean
  walletBalanceMinor: number
  createdAt: string
  updatedAt: string
  raw: any
}

export type SupabaseOrderRecord = {
  _id: string
  userId: string
  productId: string | null
  productName: string
  productSlug: string
  packageKey: string | null
  countValue: number | null
  playerAccount: string
  unitCostMinor: number
  unitPriceMinor: number
  totalCostMinor: number
  totalPriceMinor: number
  profitMinor: number
  status: string
  fulfillMode: string
  providerOrderRef: string | null
  failureCode: string | null
  createdAt: string
  updatedAt: string
  raw: any
}

export type SupabaseWalletTransactionRecord = {
  _id: string
  userId: string
  type: string
  amountMinor: number
  balanceAfterMinor: number
  referenceType: string | null
  referenceId: string | null
  note: string
  createdAt: string
  raw: any
}

export type SupabaseDepositRecord = {
  _id: string
  userId: string
  amountMinor: number
  receiptUrl: string
  status: string
  adminNote: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  raw: any
}

export type SupabaseManualOrderRecord = {
  _id: string
  orderId: string
  assignedAdminId: string | null
  createdByAdminId: string | null
  source: string
  note: string
  status: string
  createdAt: string
  updatedAt: string
  raw: any
}

export type SupabaseOrderAuditRecord = {
  _id: string
  orderId: string
  action: string
  actorType: string
  actorId: string | null
  message: string
  payload: Record<string, any>
  createdAt: string
}

export type SupabaseManualOrderAuditRecord = {
  _id: string
  manualOrderId: string
  adminId: string | null
  action: string
  note: string
  createdAt: string
}

function toIso(value: unknown, fallback?: string) {
  if (typeof value === 'string' && value) return value
  if (value instanceof Date) return value.toISOString()
  return fallback ?? new Date().toISOString()
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toNullableString(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

export async function getSupabaseUserRecord(userId: string) {
  const row = (await getDocumentByUserId('users', userId)) ?? (await getDocumentById('users', userId))
  if (!row) return null

  const payload = row.payload ?? {}
  return {
    id: row.id,
    userId: row.user_id ?? row.id,
    email: String(payload.email ?? row.email ?? ''),
    name: String(payload.name ?? 'User'),
    role: (payload.role ?? 'customer') as 'customer' | 'admin',
    isActive: payload.isActive !== false,
    walletBalanceMinor: toNumber(payload.walletBalanceMinor, 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    raw: row,
  } satisfies SupabaseUserRecord
}

export async function saveSupabaseUserWalletBalance(row: SupabaseUserRecord, walletBalanceMinor: number) {
  const payload = row.raw?.payload ?? {}
  return writeDocument({
    id: row.id,
    collection: 'users',
    email: row.email,
    userId: row.userId,
    status: row.raw?.status ?? 'active',
    isActive: row.isActive,
    payload: {
      ...payload,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      walletBalanceMinor,
    },
  })
}

export async function listSupabaseUsers() {
  const rows = await queryDocuments('users')
  return rows.map((row: any) => {
    const payload = row.payload ?? {}
    return {
      _id: row.user_id ?? row.id,
      id: row.id,
      userId: row.user_id ?? row.id,
      name: String(payload.name ?? 'User'),
      email: String(payload.email ?? row.email ?? ''),
      role: (payload.role ?? 'customer') as 'customer' | 'admin',
      isActive: payload.isActive !== false,
      walletBalanceMinor: toNumber(payload.walletBalanceMinor, 0),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      raw: row,
    }
  })
}

export async function saveSupabaseUserAdminState(row: any, updates: { role: 'customer' | 'admin'; isActive: boolean }) {
  const payload = row.raw?.payload ?? {}
  return writeDocument({
    id: row.id,
    collection: 'users',
    email: row.email,
    userId: row.userId,
    status: row.raw?.status ?? 'active',
    isActive: updates.isActive,
    payload: {
      ...payload,
      name: row.name,
      email: row.email,
      role: updates.role,
      isActive: updates.isActive,
      walletBalanceMinor: row.walletBalanceMinor,
    },
  })
}

export async function listSupabaseOrders() {
  const rows = await queryDocuments('orders')
  return rows.map((row: any) => {
    const payload = row.payload ?? {}
    return {
      _id: row.id,
      userId: String(payload.userId ?? row.user_id ?? ''),
      productId: toNullableString(payload.productId),
      productName: String(payload.productName ?? ''),
      productSlug: String(payload.productSlug ?? ''),
      packageKey: toNullableString(payload.packageKey),
      countValue: payload.countValue === null || typeof payload.countValue === 'undefined' ? null : toNumber(payload.countValue),
      playerAccount: String(payload.playerAccount ?? ''),
      unitCostMinor: toNumber(payload.unitCostMinor),
      unitPriceMinor: toNumber(payload.unitPriceMinor),
      totalCostMinor: toNumber(payload.totalCostMinor),
      totalPriceMinor: toNumber(payload.totalPriceMinor),
      profitMinor: toNumber(payload.profitMinor),
      status: String(row.status ?? payload.status ?? 'processing'),
      fulfillMode: String(payload.fulfillMode ?? 'provider'),
      providerOrderRef: toNullableString(payload.providerOrderRef),
      failureCode: toNullableString(payload.failureCode),
      createdAt: toIso(payload.createdAt ?? row.created_at),
      updatedAt: toIso(payload.updatedAt ?? row.updated_at),
      raw: row,
    } satisfies SupabaseOrderRecord
  })
}

export async function getSupabaseOrderById(id: string) {
  const row = await getDocumentById('orders', id)
  if (!row) return null
  return (await listSupabaseOrders()).find((item: any) => item._id === id) ?? null
}

export async function saveSupabaseOrder(input: {
  id?: string
  userId: string
  status: string
  payload: Record<string, any>
}) {
  return writeDocument({
    id: input.id,
    collection: 'orders',
    userId: input.userId,
    status: input.status,
    payload: {
      ...input.payload,
      userId: input.userId,
      status: input.status,
      updatedAt: new Date().toISOString(),
      createdAt: input.payload.createdAt ?? new Date().toISOString(),
    },
  })
}

export async function listSupabaseWalletTransactions(userId?: string) {
  const rows = await queryDocuments('wallet_transactions', userId ? { userId } : {})
  return rows.map((row: any) => {
    const payload = row.payload ?? {}
    return {
      _id: row.id,
      userId: String(payload.userId ?? row.user_id ?? ''),
      type: String(payload.type ?? ''),
      amountMinor: toNumber(payload.amountMinor),
      balanceAfterMinor: toNumber(payload.balanceAfterMinor),
      referenceType: toNullableString(payload.referenceType),
      referenceId: toNullableString(payload.referenceId),
      note: String(payload.note ?? ''),
      createdAt: toIso(payload.createdAt ?? row.created_at),
      raw: row,
    } satisfies SupabaseWalletTransactionRecord
  })
}

export async function createSupabaseWalletTransaction(input: {
  userId: string
  type: string
  amountMinor: number
  balanceAfterMinor: number
  referenceType?: string | null
  referenceId?: string | null
  note?: string
}) {
  return writeDocument({
    collection: 'wallet_transactions',
    userId: input.userId,
    status: input.type,
    payload: {
      userId: input.userId,
      type: input.type,
      amountMinor: input.amountMinor,
      balanceAfterMinor: input.balanceAfterMinor,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? '',
      createdAt: new Date().toISOString(),
    },
  })
}

export async function listSupabaseDeposits(userId?: string) {
  const rows = await queryDocuments('wallet_deposit_requests', userId ? { userId } : {})
  return rows.map((row: any) => {
    const payload = row.payload ?? {}
    return {
      _id: row.id,
      userId: String(payload.userId ?? row.user_id ?? ''),
      amountMinor: toNumber(payload.amountMinor),
      receiptUrl: String(payload.receiptUrl ?? ''),
      status: String(row.status ?? payload.status ?? 'pending'),
      adminNote: String(payload.adminNote ?? ''),
      reviewedBy: toNullableString(payload.reviewedBy),
      reviewedAt: payload.reviewedAt ? toIso(payload.reviewedAt) : null,
      createdAt: toIso(payload.createdAt ?? row.created_at),
      updatedAt: toIso(payload.updatedAt ?? row.updated_at),
      raw: row,
    } satisfies SupabaseDepositRecord
  })
}

export async function getSupabaseDepositById(id: string) {
  const row = await getDocumentById('wallet_deposit_requests', id)
  if (!row) return null
  return (await listSupabaseDeposits()).find((item: any) => item._id === id) ?? null
}

export async function saveSupabaseDeposit(input: {
  id?: string
  userId: string
  status: string
  payload: Record<string, any>
}) {
  return writeDocument({
    id: input.id,
    collection: 'wallet_deposit_requests',
    userId: input.userId,
    status: input.status,
    payload: {
      ...input.payload,
      userId: input.userId,
      status: input.status,
      updatedAt: new Date().toISOString(),
      createdAt: input.payload.createdAt ?? new Date().toISOString(),
    },
  })
}

export async function listSupabaseManualOrders() {
  const rows = await queryDocuments('manual_orders')
  return rows.map((row: any) => {
    const payload = row.payload ?? {}
    return {
      _id: row.id,
      orderId: String(payload.orderId ?? ''),
      assignedAdminId: toNullableString(payload.assignedAdminId),
      createdByAdminId: toNullableString(payload.createdByAdminId),
      source: String(payload.source ?? 'customer_queue'),
      note: String(payload.note ?? ''),
      status: String(row.status ?? payload.status ?? 'pending'),
      createdAt: toIso(payload.createdAt ?? row.created_at),
      updatedAt: toIso(payload.updatedAt ?? row.updated_at),
      raw: row,
    } satisfies SupabaseManualOrderRecord
  })
}

export async function getSupabaseManualOrderById(id: string) {
  const row = await getDocumentById('manual_orders', id)
  if (!row) return null
  return (await listSupabaseManualOrders()).find((item: any) => item._id === id) ?? null
}

export async function saveSupabaseManualOrder(input: {
  id?: string
  orderId: string
  status: string
  payload: Record<string, any>
}) {
  return writeDocument({
    id: input.id,
    collection: 'manual_orders',
    status: input.status,
    payload: {
      ...input.payload,
      orderId: input.orderId,
      status: input.status,
      updatedAt: new Date().toISOString(),
      createdAt: input.payload.createdAt ?? new Date().toISOString(),
    },
  })
}

export async function listSupabaseOrderAudits(orderId?: string) {
  const rows = await queryDocuments('order_audit_logs')
  return rows
    .map((row: any) => {
      const payload = row.payload ?? {}
      return {
        _id: row.id,
        orderId: String(payload.orderId ?? ''),
        action: String(payload.action ?? ''),
        actorType: String(payload.actorType ?? 'system'),
        actorId: toNullableString(payload.actorId),
        message: String(payload.message ?? ''),
        payload: (payload.payload ?? {}) as Record<string, any>,
        createdAt: toIso(payload.createdAt ?? row.created_at),
      } satisfies SupabaseOrderAuditRecord
    })
    .filter((row: any) => !orderId || row.orderId === orderId)
}

export async function createSupabaseOrderAudit(input: {
  orderId: string
  action: string
  actorType: string
  actorId?: string | null
  message: string
  payload?: Record<string, any>
}) {
  return writeDocument({
    collection: 'order_audit_logs',
    status: input.action,
    payload: {
      orderId: input.orderId,
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      message: input.message,
      payload: input.payload ?? {},
      createdAt: new Date().toISOString(),
    },
  })
}

export async function createSupabaseManualOrderAudit(input: {
  manualOrderId: string
  adminId?: string | null
  action: string
  note: string
}) {
  return writeDocument({
    collection: 'manual_order_audit_logs',
    status: input.action,
    payload: {
      manualOrderId: input.manualOrderId,
      adminId: input.adminId ?? null,
      action: input.action,
      note: input.note,
      createdAt: new Date().toISOString(),
    },
  })
}

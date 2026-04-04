import { z } from 'zod'
import { ApiError } from '@/core/http'
import { connectDb } from '@/modules/db/connection'
import { createDatabaseUnavailableError, isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { WalletDepositMethodModel } from '@/domain/models'
import {
  deleteDocument,
  getDocumentById,
  getDocumentBySlug,
  isSupabaseNotReadyError,
  isSupabaseUnavailableError,
  queryDocuments,
  writeDocument,
} from '@/modules/supabase/documents'

const depositMethodSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['crypto', 'mobile', 'bank', 'cash']),
  network: z.string().optional().default(''),
  currency: z.string().min(1),
  address: z.string().optional().default(''),
  accountNumber: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  holderName: z.string().optional().default(''),
  iconUrl: z.string().optional().default(''),
  instructions: z.string().optional().default(''),
  processingTimeText: z.string().optional().default(''),
  requiresReceipt: z.boolean().default(true),
  minAmount: z.number().nullable().optional().default(null),
  maxAmount: z.number().nullable().optional().default(null),
  feePercent: z.number().optional().default(0),
  feeFixed: z.number().optional().default(0),
  active: z.boolean().default(true),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().optional().default(0),
})

function normalizeMethod(method: any) {
  return {
    _id: String(method._id),
    key: method.key,
    name: method.name,
    type: method.type,
    network: method.network ?? '',
    currency: method.currency,
    address: method.address ?? '',
    accountNumber: method.accountNumber ?? '',
    phone: method.phone ?? '',
    holderName: method.holderName ?? '',
    iconUrl: method.iconUrl ?? '',
    instructions: method.instructions ?? '',
    processingTimeText: method.processingTimeText ?? '',
    requiresReceipt: Boolean(method.requiresReceipt),
    minAmount: method.minAmount ?? null,
    maxAmount: method.maxAmount ?? null,
    feePercent: Number(method.feePercent ?? 0),
    feeFixed: Number(method.feeFixed ?? 0),
    active: Boolean(method.active),
    visible: Boolean(method.visible),
    sortOrder: Number(method.sortOrder ?? 0),
    updatedAt: method.updatedAt ? new Date(method.updatedAt).toISOString() : null,
    createdAt: method.createdAt ? new Date(method.createdAt).toISOString() : null,
  }
}

function normalizeSupabaseMethod(method: any) {
  return {
    _id: String(method.id),
    key: method.payload?.key ?? method.slug ?? '',
    name: method.payload?.name ?? '',
    type: method.payload?.type ?? 'crypto',
    network: method.payload?.network ?? '',
    currency: method.payload?.currency ?? '',
    address: method.payload?.address ?? '',
    accountNumber: method.payload?.accountNumber ?? '',
    phone: method.payload?.phone ?? '',
    holderName: method.payload?.holderName ?? '',
    iconUrl: method.payload?.iconUrl ?? '',
    instructions: method.payload?.instructions ?? '',
    processingTimeText: method.payload?.processingTimeText ?? '',
    requiresReceipt: Boolean(method.payload?.requiresReceipt ?? true),
    minAmount: method.payload?.minAmount ?? null,
    maxAmount: method.payload?.maxAmount ?? null,
    feePercent: Number(method.payload?.feePercent ?? 0),
    feeFixed: Number(method.payload?.feeFixed ?? 0),
    active: Boolean(method.is_active ?? method.payload?.active ?? true),
    visible: Boolean(method.is_visible ?? method.payload?.visible ?? true),
    sortOrder: Number(method.sort_order ?? method.payload?.sortOrder ?? 0),
    updatedAt: method.updated_at ?? null,
    createdAt: method.created_at ?? null,
  }
}

export async function listAdminDepositMethods() {
  if (isSupabaseProvider()) {
    try {
      const items = await queryDocuments('wallet_deposit_methods')
      return items.map(normalizeSupabaseMethod)
    } catch (error) {
      if (isSupabaseNotReadyError(error)) return []
      throw error
    }
  }

  if (!isMongoEnabled()) return []

  await connectDb()
  const items = await WalletDepositMethodModel.find({})
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean()

  return items.map(normalizeMethod)
}

export async function listPublicDepositMethods() {
  if (isSupabaseProvider()) {
    try {
      const items = await queryDocuments('wallet_deposit_methods', { isActive: true, isVisible: true })
      return items.map(normalizeSupabaseMethod)
    } catch (error) {
      if (isSupabaseNotReadyError(error) || isSupabaseUnavailableError(error)) return []
      throw error
    }
  }

  if (!isMongoEnabled()) return []

  await connectDb()
  const items = await WalletDepositMethodModel.find({ active: true, visible: true })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean()

  return items.map(normalizeMethod)
}

export async function createDepositMethod(input: unknown) {
  if (isSupabaseProvider()) {
    const parsed = depositMethodSchema.parse(input)
    const exists = await getDocumentBySlug('wallet_deposit_methods', parsed.key)
    if (exists) throw new ApiError(409, 'METHOD_KEY_EXISTS', 'Deposit method key already exists')

    const created = await writeDocument({
      collection: 'wallet_deposit_methods',
      slug: parsed.key,
      sortOrder: parsed.sortOrder,
      isActive: parsed.active,
      isVisible: parsed.visible,
      payload: parsed,
    })

    return normalizeSupabaseMethod(created)
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Wallet deposit methods')

  await connectDb()
  const parsed = depositMethodSchema.parse(input)

  const exists = await WalletDepositMethodModel.findOne({ key: parsed.key }).select({ _id: 1 }).lean()
  if (exists) throw new ApiError(409, 'METHOD_KEY_EXISTS', 'Deposit method key already exists')

  const created = await WalletDepositMethodModel.create(parsed)
  return normalizeMethod(created.toObject())
}

export async function updateDepositMethod(id: string, input: unknown) {
  if (isSupabaseProvider()) {
    const parsed = depositMethodSchema.parse(input)

    const existing = await getDocumentById('wallet_deposit_methods', id)
    if (!existing) throw new ApiError(404, 'METHOD_NOT_FOUND', 'Deposit method not found')

    const duplicate = await getDocumentBySlug('wallet_deposit_methods', parsed.key)
    if (duplicate && duplicate.id !== id) throw new ApiError(409, 'METHOD_KEY_EXISTS', 'Deposit method key already exists')

    const updated = await writeDocument({
      id,
      collection: 'wallet_deposit_methods',
      slug: parsed.key,
      sortOrder: parsed.sortOrder,
      isActive: parsed.active,
      isVisible: parsed.visible,
      payload: parsed,
    })

    return normalizeSupabaseMethod(updated)
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Wallet deposit methods')

  await connectDb()
  const parsed = depositMethodSchema.parse(input)

  const existing = await WalletDepositMethodModel.findById(id)
  if (!existing) throw new ApiError(404, 'METHOD_NOT_FOUND', 'Deposit method not found')

  const duplicate = await WalletDepositMethodModel.findOne({ key: parsed.key, _id: { $ne: id } })
    .select({ _id: 1 })
    .lean()
  if (duplicate) throw new ApiError(409, 'METHOD_KEY_EXISTS', 'Deposit method key already exists')

  Object.assign(existing, parsed)
  await existing.save()

  return normalizeMethod(existing.toObject())
}

export async function deleteDepositMethod(id: string) {
  if (isSupabaseProvider()) {
    const existing = await getDocumentById('wallet_deposit_methods', id)
    if (!existing) throw new ApiError(404, 'METHOD_NOT_FOUND', 'Deposit method not found')
    await deleteDocument('wallet_deposit_methods', id)
    return { id }
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Wallet deposit methods')

  await connectDb()
  const deleted = await WalletDepositMethodModel.findByIdAndDelete(id).lean()
  if (!deleted) throw new ApiError(404, 'METHOD_NOT_FOUND', 'Deposit method not found')
  return { id }
}

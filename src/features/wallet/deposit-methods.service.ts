import { z } from 'zod'
import { ApiError } from '@/core/http'
import { connectDb } from '@/modules/db/connection'
import { WalletDepositMethodModel } from '@/domain/models'

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

export async function listAdminDepositMethods() {
  await connectDb()
  const items = await WalletDepositMethodModel.find({})
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean()

  return items.map(normalizeMethod)
}

export async function listPublicDepositMethods() {
  await connectDb()
  const items = await WalletDepositMethodModel.find({ active: true, visible: true })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean()

  return items.map(normalizeMethod)
}

export async function createDepositMethod(input: unknown) {
  await connectDb()
  const parsed = depositMethodSchema.parse(input)

  const exists = await WalletDepositMethodModel.findOne({ key: parsed.key }).select({ _id: 1 }).lean()
  if (exists) throw new ApiError(409, 'METHOD_KEY_EXISTS', 'Deposit method key already exists')

  const created = await WalletDepositMethodModel.create(parsed)
  return normalizeMethod(created.toObject())
}

export async function updateDepositMethod(id: string, input: unknown) {
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
  await connectDb()
  const deleted = await WalletDepositMethodModel.findByIdAndDelete(id).lean()
  if (!deleted) throw new ApiError(404, 'METHOD_NOT_FOUND', 'Deposit method not found')
  return { id }
}

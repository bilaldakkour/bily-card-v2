import mongoose from 'mongoose'
import { ApiError } from '@/core/http'
import { connectDb } from '@/modules/db/connection'
import { UserModel } from '@/domain/models'

export async function listAdminUsers(input: { q?: string; role?: 'all' | 'customer' | 'admin'; limit?: number }) {
  await connectDb()

  const q = (input.q ?? '').trim()
  const role = input.role ?? 'all'
  const limit = Math.min(300, Math.max(1, input.limit ?? 200))

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]
  }

  if (role !== 'all') {
    filter.role = role
  }

  const items = await UserModel.find(filter)
    .select({ name: 1, email: 1, role: 1, isActive: 1, walletBalanceMinor: 1, createdAt: 1, updatedAt: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return items
}

export async function updateUserByAdmin(input: {
  userId: string
  adminId: string
  role?: 'customer' | 'admin'
  isActive?: boolean
}) {
  await connectDb()

  if (!mongoose.isValidObjectId(input.userId)) {
    throw new ApiError(400, 'INVALID_USER_ID', 'Invalid user id')
  }

  if (typeof input.role === 'undefined' && typeof input.isActive === 'undefined') {
    throw new ApiError(400, 'NO_UPDATES', 'No updates provided')
  }

  const target = await UserModel.findById(input.userId)
  if (!target) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')
  }

  if (String(target._id) === input.adminId) {
    if (input.role && input.role !== 'admin') {
      throw new ApiError(409, 'SELF_ROLE_CHANGE_FORBIDDEN', 'Admin cannot remove own admin role')
    }

    if (input.isActive === false) {
      throw new ApiError(409, 'SELF_DEACTIVATE_FORBIDDEN', 'Admin cannot deactivate own account')
    }
  }

  const nextRole = input.role ?? target.role
  const nextActive = typeof input.isActive === 'boolean' ? input.isActive : target.isActive

  if (target.role === 'admin' && target.isActive && (nextRole !== 'admin' || !nextActive)) {
    const activeAdmins = await UserModel.countDocuments({ role: 'admin', isActive: true })
    if (activeAdmins <= 1) {
      throw new ApiError(409, 'LAST_ADMIN_PROTECTED', 'Cannot disable the last active admin')
    }
  }

  target.role = nextRole
  target.isActive = nextActive
  await target.save()

  return {
    _id: String(target._id),
    name: target.name,
    email: target.email,
    role: target.role,
    isActive: target.isActive,
    walletBalanceMinor: target.walletBalanceMinor,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
  }
}

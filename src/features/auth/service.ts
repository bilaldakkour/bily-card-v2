import { randomUUID } from 'node:crypto'
import { connectDb } from '@/modules/db/connection'
import { UserModel } from '@/domain/models'
import { ApiError } from '@/core/http'
import { isSupabaseProvider } from '@/modules/db/provider'
import { hashPassword, verifyPassword } from '@/modules/security/password'
import { getDocumentByEmail, getDocumentById, getDocumentByUserId, writeDocument } from '@/modules/supabase/documents'

type StoredUser = {
  name: string
  email: string
  passwordHash: string
  role: 'customer' | 'admin'
  isActive: boolean
  walletBalanceMinor?: number
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}

function mapSupabaseUser(row: { id: string; payload: Record<string, any> }) {
  const user = row.payload as StoredUser
  return {
    id: row.id,
    userId: (row as any).user_id ?? row.id,
    email: user.email ?? (row as any).email ?? '',
    role: user.role,
    name: user.name ?? 'User',
    isActive: user.isActive !== false,
    passwordHash: user.passwordHash,
  }
}

async function getSupabaseUserBySessionId(userId: string) {
  const byUserId = await getDocumentByUserId('users', userId)
  if (byUserId) return byUserId

  const byId = await getDocumentById('users', userId)
  if (byId) return byId

  return null
}

export async function registerCustomer(input: { name: string; email: string; password: string }) {
  if (isSupabaseProvider()) {
    const email = normalizeEmail(input.email)
    const exists = await getDocumentByEmail('users', email)
    if (exists) throw new ApiError(409, 'EMAIL_EXISTS', 'Email already used')

    const user = await writeDocument({
      id: randomUUID(),
      collection: 'users',
      email,
      userId: undefined,
      status: 'active',
      isActive: true,
      payload: {
        name: input.name.trim(),
        email,
        passwordHash: await hashPassword(input.password),
        role: 'customer',
        isActive: true,
        walletBalanceMinor: 0,
      },
    })

    const ensuredUserId = user.user_id ?? user.id
    const syncedUser = user.user_id
      ? user
      : await writeDocument({
          id: user.id,
          collection: 'users',
          email,
          userId: ensuredUserId,
          status: 'active',
          isActive: true,
          payload: {
            ...user.payload,
            email,
          },
        })

    const payload = mapSupabaseUser(syncedUser)
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    }
  }

  await connectDb()

  const exists = await UserModel.findOne({ email: input.email }).select({ _id: 1 }).lean()
  if (exists) throw new ApiError(409, 'EMAIL_EXISTS', 'Email already used')

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'customer',
  })

  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    name: user.name,
  }
}

export async function loginByEmail(input: { email: string; password: string }) {
  if (isSupabaseProvider()) {
    const row = await getDocumentByEmail('users', normalizeEmail(input.email))
    if (!row) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')

    const user = mapSupabaseUser(row)
    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')

    if (!user.isActive) throw new ApiError(403, 'INACTIVE_ACCOUNT', 'Account is disabled')

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }
  }

  await connectDb()

  const user = (await UserModel.findOne({ email: input.email }).lean()) as any
  if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')

  const valid = await verifyPassword(input.password, user.passwordHash)
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')

  if (!user.isActive) throw new ApiError(403, 'INACTIVE_ACCOUNT', 'Account is disabled')

  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    name: user.name,
  }
}

export async function getUserSessionPayloadById(userId: string) {
  if (isSupabaseProvider()) {
    const row = await getSupabaseUserBySessionId(userId)
    if (!row) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

    const user = mapSupabaseUser(row)
    if (!user.isActive) throw new ApiError(403, 'INACTIVE_ACCOUNT', 'Account is disabled')

    return {
      id: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
    }
  }

  await connectDb()

  const user = (await UserModel.findById(userId).select({ email: 1, role: 1, name: 1, isActive: 1 }).lean()) as any
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')
  if (!user.isActive) throw new ApiError(403, 'INACTIVE_ACCOUNT', 'Account is disabled')

  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    name: user.name,
  }
}

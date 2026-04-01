import { connectDb } from '@/modules/db/connection'
import { UserModel } from '@/domain/models'
import { ApiError } from '@/core/http'
import { hashPassword, verifyPassword } from '@/modules/security/password'

export async function registerCustomer(input: { name: string; email: string; password: string }) {
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


import { ApiError } from '@/core/http'
import { getSession } from '@/modules/security/session'

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Please login first')
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin access required')
  }
  return session
}


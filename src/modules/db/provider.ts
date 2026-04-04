import { env } from '@/core/env'
import { ApiError } from '@/core/http'

export const databaseProvider = env.DATABASE_PROVIDER

export function isMongoProvider() {
  return databaseProvider === 'mongo'
}

export function isSupabaseProvider() {
  return databaseProvider === 'supabase'
}

export function isMongoEnabled() {
  return isMongoProvider() && Boolean(env.MONGODB_URI)
}

export function createDatabaseUnavailableError(feature = 'This feature') {
  return new ApiError(
    503,
    'DATABASE_NOT_CONFIGURED',
    `${feature} is not configured yet for DATABASE_PROVIDER=${databaseProvider}.`
  )
}

export function assertMongoAvailable(feature?: string) {
  if (!isMongoEnabled()) {
    throw createDatabaseUnavailableError(feature)
  }
}

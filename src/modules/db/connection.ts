import mongoose from 'mongoose'
import { env } from '@/core/env'
import { assertMongoAvailable } from './provider'

declare global {
  // eslint-disable-next-line no-var
  var __bilyMongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}

const globalCache = global.__bilyMongoose ?? { conn: null, promise: null }
global.__bilyMongoose = globalCache

export async function connectDb() {
  assertMongoAvailable('MongoDB-backed data')

  if (globalCache.conn) return globalCache.conn

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(env.MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
    })
  }

  globalCache.conn = await globalCache.promise
  return globalCache.conn
}

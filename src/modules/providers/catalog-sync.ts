import { ProviderCatalogCacheModel } from '@/domain/models'
import { connectDb } from '@/modules/db/connection'
import { fetchDailyCardCatalog } from '@/modules/providers/adapters/dailycard.adapter'

const PROVIDER_SYNC_INTERVAL_MS = 1000 * 60 * 5
const providerSyncLocks = new Map<string, Promise<unknown>>()

export async function syncProviderCatalog(provider: 'daily_card' | 'go4_card') {
  await connectDb()

  if (provider !== 'daily_card') {
    throw new Error(`Catalog sync is not implemented for ${provider}`)
  }

  const products = await fetchDailyCardCatalog()

  await ProviderCatalogCacheModel.findOneAndUpdate(
    { provider },
    {
      provider,
      products,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    },
    { upsert: true }
  )

  return {
    provider,
    productsCount: products.length,
  }
}

export async function ensureProviderCatalogFresh(provider: 'daily_card' | 'go4_card') {
  await connectDb()

  const cache = (await ProviderCatalogCacheModel.findOne({ provider }).select({ fetchedAt: 1 }).lean()) as {
    fetchedAt?: Date | string
  } | null
  const lastFetchedAt = cache?.fetchedAt ? new Date(cache.fetchedAt).getTime() : 0
  const isFresh = lastFetchedAt > 0 && Date.now() - lastFetchedAt < PROVIDER_SYNC_INTERVAL_MS

  if (isFresh) return

  const existing = providerSyncLocks.get(provider)
  if (existing) return

  const syncPromise = syncProviderCatalog(provider).catch(() => undefined).finally(() => {
    providerSyncLocks.delete(provider)
  })

  providerSyncLocks.set(provider, syncPromise)
}

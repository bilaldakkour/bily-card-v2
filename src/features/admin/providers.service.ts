import { ApiError } from '@/core/http'
import { connectDb } from '@/modules/db/connection'
import { isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { ProviderSettingsModel } from '@/domain/models'
import { getDocumentBySlug, isSupabaseNotReadyError, queryDocuments, writeDocument } from '@/modules/supabase/documents'

type ProviderSettingsInput = {
  provider: 'daily_card' | 'go4_card'
  baseUrl: string
  enabled: boolean
  timeoutMs: number
}

function normalizeProviderSettings(row: any) {
  return {
    _id: String(row._id),
    provider: row.provider,
    baseUrl: row.baseUrl,
    enabled: Boolean(row.enabled),
    timeoutMs: Number(row.timeoutMs ?? 30000),
    updatedAt: row.updatedAt ?? null,
  }
}

function normalizeSupabaseProviderSettings(row: any) {
  return {
    _id: String(row.id),
    provider: row.payload?.provider ?? row.slug,
    baseUrl: row.payload?.baseUrl ?? '',
    enabled: Boolean(row.payload?.enabled ?? true),
    timeoutMs: Number(row.payload?.timeoutMs ?? 30000),
    updatedAt: row.updated_at ?? null,
  }
}

export async function listProviderSettings() {
  if (isSupabaseProvider()) {
    try {
      const rows = await queryDocuments('provider_settings')
      return rows.map(normalizeSupabaseProviderSettings)
    } catch (error) {
      if (isSupabaseNotReadyError(error)) return []
      throw error
    }
  }

  if (!isMongoEnabled()) return []

  await connectDb()
  const settings = await ProviderSettingsModel.find({})
    .select({ provider: 1, baseUrl: 1, enabled: 1, timeoutMs: 1, updatedAt: 1 })
    .sort({ provider: 1 })
    .lean()

  return settings.map(normalizeProviderSettings)
}

export async function saveProviderSettings(input: ProviderSettingsInput) {
  if (isSupabaseProvider()) {
    const existing = await getDocumentBySlug('provider_settings', input.provider)
    const saved = await writeDocument({
      id: existing?.id,
      collection: 'provider_settings',
      slug: input.provider,
      isActive: input.enabled,
      payload: input,
    })

    return normalizeSupabaseProviderSettings(saved)
  }

  if (!isMongoEnabled()) {
    throw new ApiError(503, 'DATABASE_NOT_CONFIGURED', 'Provider settings are not configured yet.')
  }

  await connectDb()
  await ProviderSettingsModel.findOneAndUpdate(
    { provider: input.provider },
    {
      provider: input.provider,
      baseUrl: input.baseUrl,
      enabled: input.enabled,
      timeoutMs: input.timeoutMs,
    },
    { upsert: true }
  )

  const saved = await ProviderSettingsModel.findOne({ provider: input.provider }).lean()
  return normalizeProviderSettings(saved)
}

import { model, models, Schema, type InferSchemaType } from 'mongoose'

const cacheSchema = new Schema(
  {
    provider: { type: String, enum: ['daily_card', 'go4_card'], required: true, unique: true, index: true },
    products: { type: [Schema.Types.Mixed], default: [] },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

export type ProviderCatalogCacheDoc = InferSchemaType<typeof cacheSchema>
export const ProviderCatalogCacheModel = models.ProviderCatalogCache || model('ProviderCatalogCache', cacheSchema)


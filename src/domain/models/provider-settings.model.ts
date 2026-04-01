import { model, models, Schema, type InferSchemaType } from 'mongoose'

const providerSettingsSchema = new Schema(
  {
    provider: { type: String, enum: ['daily_card', 'go4_card'], required: true, unique: true, index: true },
    baseUrl: { type: String, default: '' },
    apiKeyEncrypted: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    timeoutMs: { type: Number, default: 6000 },
  },
  { timestamps: true }
)

export type ProviderSettingsDoc = InferSchemaType<typeof providerSettingsSchema>
export const ProviderSettingsModel = models.ProviderSettings || model('ProviderSettings', providerSettingsSchema)


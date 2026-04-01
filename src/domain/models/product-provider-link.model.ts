import { model, models, Schema, type InferSchemaType } from 'mongoose'

const providerLinkSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    packageKey: { type: String, default: null, index: true },
    provider: { type: String, enum: ['daily_card', 'go4_card'], required: true, index: true },
    providerProductId: { type: String, required: true },
    providerVariantId: { type: String, default: null },
    isPrimary: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 100, index: true },
    forceProvider: { type: Boolean, default: false },
  },
  { timestamps: true }
)

providerLinkSchema.index({ productId: 1, packageKey: 1, active: 1, priority: 1 })

export type ProductProviderLinkDoc = InferSchemaType<typeof providerLinkSchema>
export const ProductProviderLinkModel = models.ProductProviderLink || model('ProductProviderLink', providerLinkSchema)


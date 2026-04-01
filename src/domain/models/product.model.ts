import { model, models, Schema, type InferSchemaType } from 'mongoose'

const packageSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    countValue: { type: Number, default: null },
    visible: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    manualPriceMinor: { type: Number, default: null },
    manualStock: { type: Number, default: null },
  },
  { _id: false }
)

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: null },
    category: { type: String, required: true, index: true },
    kind: { type: String, enum: ['package', 'count', 'manual'], required: true, index: true },
    visible: { type: Boolean, default: true, index: true },
    hiddenFromCustomer: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    forceOutOfStock: { type: Boolean, default: false, index: true },
    manualStock: { type: Number, default: null },
    countConfig: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      step: { type: Number, default: null },
      manualUnitPrice: { type: Number, default: null },
      manualUnitPriceMinor: { type: Number, default: null },
    },
    packages: { type: [packageSchema], default: [] },
    routingMode: {
      type: String,
      enum: ['manual_only', 'provider_only', 'cheapest_with_fallback'],
      default: 'provider_only',
    },
    bestsellerRank: { type: Number, default: 9999 },
  },
  { timestamps: true }
)

productSchema.index({ visible: 1, active: 1, category: 1 })

export type ProductDoc = InferSchemaType<typeof productSchema>
export const ProductModel = models.Product || model('Product', productSchema)


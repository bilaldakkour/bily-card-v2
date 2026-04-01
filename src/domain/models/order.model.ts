import { model, models, Schema, type InferSchemaType } from 'mongoose'

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    packageKey: { type: String, default: null },
    countValue: { type: Number, default: null },
    playerAccount: { type: String, required: true },
    unitCostMinor: { type: Number, required: true, default: 0 },
    unitPriceMinor: { type: Number, required: true },
    totalCostMinor: { type: Number, required: true, default: 0 },
    totalPriceMinor: { type: Number, required: true },
    profitMinor: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'manual_pending'],
      default: 'pending',
      index: true,
    },
    fulfillMode: { type: String, enum: ['provider', 'manual'], required: true },
    providerOrderRef: { type: String, default: null },
    failureCode: { type: String, default: null },
  },
  { timestamps: true }
)

orderSchema.index({ userId: 1, createdAt: -1 })

export type OrderDoc = InferSchemaType<typeof orderSchema>
export const OrderModel = models.Order || model('Order', orderSchema)


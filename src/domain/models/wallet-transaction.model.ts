import { model, models, Schema, type InferSchemaType } from 'mongoose'

const txSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['deposit', 'order_debit', 'refund', 'adjustment'],
      required: true,
      index: true,
    },
    amountMinor: { type: Number, required: true },
    balanceAfterMinor: { type: Number, required: true },
    referenceType: { type: String, default: null },
    referenceId: { type: String, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)

txSchema.index({ userId: 1, createdAt: -1 })

export type WalletTransactionDoc = InferSchemaType<typeof txSchema>
export const WalletTransactionModel = models.WalletTransaction || model('WalletTransaction', txSchema)


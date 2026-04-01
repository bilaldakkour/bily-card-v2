import { model, models, Schema, type InferSchemaType } from 'mongoose'

const depositSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountMinor: { type: Number, required: true },
    receiptUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    adminNote: { type: String, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

depositSchema.index({ status: 1, createdAt: -1 })

export type WalletDepositRequestDoc = InferSchemaType<typeof depositSchema>
export const WalletDepositRequestModel = models.WalletDepositRequest || model('WalletDepositRequest', depositSchema)


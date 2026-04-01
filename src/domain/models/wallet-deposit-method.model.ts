import { InferSchemaType, Schema, model, models } from 'mongoose'

const walletDepositMethodSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['crypto', 'mobile', 'bank', 'cash'], required: true, index: true },
    network: { type: String, default: '', trim: true },
    currency: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    holderName: { type: String, default: '', trim: true },
    iconUrl: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true },
    processingTimeText: { type: String, default: '', trim: true },
    requiresReceipt: { type: Boolean, default: true },
    minAmount: { type: Number, default: null },
    maxAmount: { type: Number, default: null },
    feePercent: { type: Number, default: 0 },
    feeFixed: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    visible: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
)

walletDepositMethodSchema.index({ active: 1, visible: 1, sortOrder: 1, updatedAt: -1 })

export type WalletDepositMethodDoc = InferSchemaType<typeof walletDepositMethodSchema>
export const WalletDepositMethodModel =
  models.WalletDepositMethod || model('WalletDepositMethod', walletDepositMethodSchema)

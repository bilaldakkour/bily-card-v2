import { model, models, Schema, type InferSchemaType } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
    walletBalanceMinor: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof userSchema>
export const UserModel = models.User || model('User', userSchema)


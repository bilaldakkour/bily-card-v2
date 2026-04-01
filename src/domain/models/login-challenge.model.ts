import { InferSchemaType, Schema, model, models } from 'mongoose'

const loginChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type LoginChallengeDoc = InferSchemaType<typeof loginChallengeSchema>
export const LoginChallengeModel = models.LoginChallenge || model('LoginChallenge', loginChallengeSchema)

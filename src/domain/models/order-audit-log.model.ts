import { model, models, Schema, type InferSchemaType } from 'mongoose'

const auditSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    action: { type: String, required: true },
    actorType: { type: String, enum: ['system', 'admin', 'customer'], required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

auditSchema.index({ orderId: 1, createdAt: 1 })

export type OrderAuditLogDoc = InferSchemaType<typeof auditSchema>
export const OrderAuditLogModel = models.OrderAuditLog || model('OrderAuditLog', auditSchema)


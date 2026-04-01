import { model, models, Schema, type InferSchemaType } from 'mongoose'

const manualAuditSchema = new Schema(
  {
    manualOrderId: { type: Schema.Types.ObjectId, ref: 'ManualOrder', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)

export type ManualOrderAuditLogDoc = InferSchemaType<typeof manualAuditSchema>
export const ManualOrderAuditLogModel = models.ManualOrderAuditLog || model('ManualOrderAuditLog', manualAuditSchema)


import { model, models, Schema, type InferSchemaType } from 'mongoose'

const manualOrderSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['customer_queue', 'admin_local'], default: 'customer_queue', index: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'processing', 'done', 'cancelled'], default: 'pending', index: true },
  },
  { timestamps: true }
)

export type ManualOrderDoc = InferSchemaType<typeof manualOrderSchema>
export const ManualOrderModel = models.ManualOrder || model('ManualOrder', manualOrderSchema)


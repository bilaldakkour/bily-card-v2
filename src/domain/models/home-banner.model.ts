import { model, models, Schema, type InferSchemaType } from 'mongoose'

const homeBannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    imageUrl: { type: String, required: true, trim: true },
    linkUrl: { type: String, default: '', trim: true },
    badge: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 1, index: true },
  },
  { timestamps: true }
)

homeBannerSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 })

export type HomeBannerDoc = InferSchemaType<typeof homeBannerSchema>
export const HomeBannerModel = models.HomeBanner || model('HomeBanner', homeBannerSchema)

import { model, models, Schema, type InferSchemaType } from 'mongoose'

const pricingRuleSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    defaultMarginPct: { type: Number, default: 15 },
    packageMarginOverrides: {
      type: Map,
      of: Number,
      default: {},
    },
    countMarginPct: { type: Number, default: 15 },
    roundingMode: {
      type: String,
      enum: ['nearest_0_01', 'nearest_0_05', 'nearest_1_00'],
      default: 'nearest_0_01',
    },
    isDiscountEnabled: { type: Boolean, default: false },
    customerDiscountPct: { type: Number, default: 0 }, // percent (10 = 10%)
  },
  { timestamps: true }
)

export type ProductPricingRuleDoc = InferSchemaType<typeof pricingRuleSchema>
export const ProductPricingRuleModel = models.ProductPricingRule || model('ProductPricingRule', pricingRuleSchema)


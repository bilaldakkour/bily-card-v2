import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

await mongoose.connect(MONGODB_URI)

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  isActive: Boolean,
  walletBalanceMinor: Number,
}, { timestamps: true }))

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
  slug: { type: String, unique: true },
  name: String,
  description: String,
  category: String,
  kind: String,
  visible: Boolean,
  active: Boolean,
  routingMode: String,
  packages: [{
    key: String,
    label: String,
    sortOrder: Number,
    visible: Boolean,
    active: Boolean,
    manualPriceMinor: Number,
  }],
  countConfig: {
    min: Number,
    max: Number,
    step: Number,
  },
}, { timestamps: true }))

const ProductPricingRule = mongoose.models.ProductPricingRule || mongoose.model('ProductPricingRule', new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  defaultMarginPct: Number,
  countMarginPct: Number,
  roundingMode: String,
  isDiscountEnabled: Boolean,
  customerDiscountPct: Number,
}, { timestamps: true }))

const ProductProviderLink = mongoose.models.ProductProviderLink || mongoose.model('ProductProviderLink', new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  packageKey: String,
  provider: String,
  providerProductId: String,
  providerVariantId: String,
  active: Boolean,
}, { timestamps: true }))

const ProviderCatalogCache = mongoose.models.ProviderCatalogCache || mongoose.model('ProviderCatalogCache', new mongoose.Schema({
  provider: { type: String, unique: true },
  products: [mongoose.Schema.Types.Mixed],
  fetchedAt: Date,
  expiresAt: Date,
}, { timestamps: true }))

await Promise.all([
  Product.deleteMany({}),
  ProductPricingRule.deleteMany({}),
  ProductProviderLink.deleteMany({}),
])

const products = await Product.create([
  {
    slug: 'pubg-uc',
    name: 'PUBG UC',
    description: 'شحن PUBG UC سريع وآمن',
    category: 'Battle Royale',
    kind: 'package',
    visible: true,
    active: true,
    routingMode: 'provider_only',
    packages: [
      { key: '60uc', label: '60 UC', sortOrder: 1, visible: true, active: true },
      { key: '325uc', label: '325 UC', sortOrder: 2, visible: true, active: true },
    ],
  },
  {
    slug: 'freefire-diamonds',
    name: 'Free Fire Diamonds',
    description: 'شحن Free Fire بأفضل سعر',
    category: 'MOBA',
    kind: 'package',
    visible: true,
    active: true,
    routingMode: 'provider_only',
    packages: [
      { key: '110d', label: '110 Diamonds', sortOrder: 1, visible: true, active: true },
      { key: '341d', label: '341 Diamonds', sortOrder: 2, visible: true, active: true },
    ],
  },
  {
    slug: 'hala-me-coins',
    name: 'Hala Me',
    description: 'منتج count-based',
    category: 'Social',
    kind: 'count',
    visible: true,
    active: true,
    routingMode: 'provider_only',
    countConfig: { min: 1, max: 100, step: 1 },
    packages: [],
  },
])

for (const p of products) {
  await ProductPricingRule.create({
    productId: p._id,
    defaultMarginPct: 20,
    countMarginPct: 18,
    roundingMode: 'nearest_0_01',
    isDiscountEnabled: false,
    customerDiscountPct: 0,
  })
}

const pubg = products.find((p) => p.slug === 'pubg-uc')
const ff = products.find((p) => p.slug === 'freefire-diamonds')
const hala = products.find((p) => p.slug === 'hala-me-coins')

await ProductProviderLink.create([
  { productId: pubg._id, packageKey: '60uc', provider: 'daily_card', providerProductId: 'pubg', providerVariantId: '60', active: true },
  { productId: pubg._id, packageKey: '325uc', provider: 'daily_card', providerProductId: 'pubg', providerVariantId: '325', active: true },
  { productId: ff._id, packageKey: '110d', provider: 'daily_card', providerProductId: 'ff', providerVariantId: '110', active: true },
  { productId: ff._id, packageKey: '341d', provider: 'daily_card', providerProductId: 'ff', providerVariantId: '341', active: true },
  { productId: hala._id, packageKey: null, provider: 'daily_card', providerProductId: 'hala', providerVariantId: null, active: true },
])

await ProviderCatalogCache.findOneAndUpdate(
  { provider: 'daily_card' },
  {
    provider: 'daily_card',
    products: [
      { productId: 'pubg', variantId: '60', cost: 0.7, available: true },
      { productId: 'pubg', variantId: '325', cost: 3.2, available: true },
      { productId: 'ff', variantId: '110', cost: 0.9, available: true },
      { productId: 'ff', variantId: '341', cost: 2.8, available: true },
      { productId: 'hala', variantId: null, cost: 0.05, available: true },
    ],
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  },
  { upsert: true, new: true }
)

const adminPasswordHash = await bcrypt.hash('Admin@12345', 12)
await User.findOneAndUpdate(
  { email: 'admin@bilycard.com' },
  {
    name: 'Bily Admin',
    email: 'admin@bilycard.com',
    passwordHash: adminPasswordHash,
    role: 'admin',
    isActive: true,
    walletBalanceMinor: 0,
  },
  { upsert: true, new: true }
)

console.log('Seed complete')
await mongoose.disconnect()


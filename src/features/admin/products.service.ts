import { z } from 'zod'
import { connectDb } from '@/modules/db/connection'
import { ApiError } from '@/core/http'
import { clearCatalogCache, getCatalogDetailBySlug } from '@/modules/catalog/service'
import { normalizePercent } from '@/core/percent'
import { ProductModel, ProductPricingRuleModel, ProductProviderLinkModel } from '@/domain/models'

const packageSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int().default(0),
  countValue: z.number().nullable().optional(),
  visible: z.boolean().default(true),
  active: z.boolean().default(true),
  manualPriceMinor: z.number().int().nullable().optional(),
  manualStock: z.number().int().nullable().optional(),
})

const adminPackageSchema = z.object({
  label: z.string().min(1),
  price: z.number(),
  active: z.boolean().default(true),
  visible: z.boolean().default(true),
})

const providerLinkSchema = z.object({
  packageKey: z.string().nullable().optional(),
  provider: z.enum(['daily_card', 'go4_card']),
  providerProductId: z.string().min(1),
  providerVariantId: z.string().nullable().optional(),
  isPrimary: z.boolean().default(true),
  enabled: z.boolean().optional(),
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  forceProvider: z.boolean().default(false),
})

const pricingSchema = z.object({
  defaultMarginPct: z.number().min(0).max(500),
  countMarginPct: z.number().min(0).max(500),
  roundingMode: z.enum(['nearest_0_01', 'nearest_0_05', 'nearest_1_00']),
  isDiscountEnabled: z.boolean(),
  customerDiscountPct: z.number().min(0).max(100),
  packageMarginOverrides: z.record(z.number().min(0).max(500)).optional().default({}),
})

const coreProductSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional().default(''),
  thumbnail: z.string().nullable().optional(),
  category: z.string().min(1),
  kind: z.enum(['package', 'count', 'manual']),
  visible: z.boolean().default(true),
  hiddenFromCustomer: z.boolean().default(false),
  active: z.boolean().default(true),
  forceOutOfStock: z.boolean().default(false),
  manualStock: z.number().int().nullable().optional(),
  routingMode: z.enum(['manual_only', 'provider_only', 'cheapest_with_fallback']),
  countConfig: z
    .object({
      min: z.number().int().nullable().optional(),
      max: z.number().int().nullable().optional(),
      step: z.number().int().nullable().optional(),
      manualUnitPrice: z.number().nullable().optional(),
      manualUnitPriceMinor: z.number().int().nullable().optional(),
    })
    .optional()
    .default({}),
})

function normalizeCountConfig(countConfig: {
  min?: number | null
  max?: number | null
  step?: number | null
  manualUnitPrice?: number | null
  manualUnitPriceMinor?: number | null
} | null | undefined) {
  const normalizedManualUnitPrice =
    countConfig?.manualUnitPrice ??
    (countConfig?.manualUnitPriceMinor !== null && countConfig?.manualUnitPriceMinor !== undefined
      ? countConfig.manualUnitPriceMinor / 100
      : null)

  return {
    min: countConfig?.min ?? null,
    max: countConfig?.max ?? null,
    step: countConfig?.step ?? null,
    manualUnitPrice: normalizedManualUnitPrice,
  }
}

export async function listAdminProducts() {
  await connectDb()

  const products = await ProductModel.find({})
    .select({
      name: 1,
      slug: 1,
      description: 1,
      thumbnail: 1,
      kind: 1,
      category: 1,
      visible: 1,
      hiddenFromCustomer: 1,
      active: 1,
      forceOutOfStock: 1,
      routingMode: 1,
      manualStock: 1,
      countConfig: 1,
      packages: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .lean()

  const ids = products.map((p) => p._id)
  const [pricingRules, providerLinks] = await Promise.all([
    ProductPricingRuleModel.find({ productId: { $in: ids } }).lean(),
    ProductProviderLinkModel.find({ productId: { $in: ids } }).lean(),
  ])

  const pricingByProduct = new Map(pricingRules.map((r) => [String(r.productId), r]))
  const linksByProduct = new Map<string, any[]>()
  for (const link of providerLinks) {
    const key = String(link.productId)
    const arr = linksByProduct.get(key) ?? []
    arr.push(link)
    linksByProduct.set(key, arr)
  }

  function normalizeOverrideMap(input: unknown) {
    if (!input) return {}
    if (input instanceof Map) {
      return Object.fromEntries(Array.from(input.entries()).map(([key, value]) => [key, normalizePercent(Number(value))]))
    }
    if (typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, number>).map(([key, value]) => [key, normalizePercent(Number(value))])
      )
    }
    return {}
  }

  return products.map((product) => ({
    ...product,
    countConfig: normalizeCountConfig((product as any).countConfig),
    pricingRule: pricingByProduct.get(String(product._id))
      ? {
          ...pricingByProduct.get(String(product._id)),
          defaultMarginPct: normalizePercent(pricingByProduct.get(String(product._id))?.defaultMarginPct ?? 15),
          countMarginPct: normalizePercent(pricingByProduct.get(String(product._id))?.countMarginPct ?? 15),
          customerDiscountPct: normalizePercent(pricingByProduct.get(String(product._id))?.customerDiscountPct ?? 0),
          packageMarginOverrides: normalizeOverrideMap(pricingByProduct.get(String(product._id))?.packageMarginOverrides),
        }
      : null,
    providerLinks: linksByProduct.get(String(product._id)) ?? [],
  }))
}

export async function createAdminProduct(input: z.input<typeof coreProductSchema>) {
  await connectDb()
  const parsed = coreProductSchema.parse(input)

  const exists = await ProductModel.findOne({ slug: parsed.slug }).select({ _id: 1 }).lean()
  if (exists) throw new ApiError(409, 'SLUG_EXISTS', 'Slug already exists')

  const product = await ProductModel.create({
    ...parsed,
    countConfig: normalizeCountConfig(parsed.countConfig),
    packages: [],
  })

  await ProductPricingRuleModel.create({
    productId: product._id,
    defaultMarginPct: 15,
    countMarginPct: 15,
    roundingMode: 'nearest_0_01',
    isDiscountEnabled: false,
    customerDiscountPct: 0,
    packageMarginOverrides: {},
  })

  clearCatalogCache()

  return { id: String(product._id) }
}

export async function updateAdminProduct(productId: string, input: z.input<typeof coreProductSchema>) {
  await connectDb()
  const parsed = coreProductSchema.parse(input)

  const product = await ProductModel.findById(productId)
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  Object.assign(product, {
    ...parsed,
    countConfig: normalizeCountConfig(parsed.countConfig),
  })
  await product.save()

  clearCatalogCache()

  return { id: String(product._id) }
}

export async function replaceProductPackages(productId: string, input: unknown) {
  await connectDb()

  const product = await ProductModel.findById(productId)
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const parsedPackages = z.array(adminPackageSchema).parse(input)
  const existingPackages = Array.isArray(product.packages) ? product.packages : []
  const packages = parsedPackages.map((pkg, index) => ({
    key: existingPackages[index]?.key ?? `pkg-${index + 1}`,
    label: pkg.label,
    sortOrder: index + 1,
    countValue: null,
    visible: pkg.visible,
    active: pkg.active,
    manualPriceMinor: Math.round(Number(pkg.price) * 100),
    manualStock: null,
  }))

  product.packages = z.array(packageSchema).parse(packages)
  await product.save()

  clearCatalogCache()

  return { id: String(product._id), packagesCount: packages.length }
}

export async function replaceProductProviderLinks(productId: string, input: unknown) {
  await connectDb()

  const product = await ProductModel.findById(productId).select({ _id: 1 }).lean()
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const links = z.array(providerLinkSchema).parse(input)

  await ProductProviderLinkModel.deleteMany({ productId })
  if (links.length > 0) {
    await ProductProviderLinkModel.insertMany(
      links.map((link) => ({
        productId,
        packageKey: link.packageKey ?? null,
        provider: link.provider,
        providerProductId: link.providerProductId,
        providerVariantId: link.providerVariantId ?? null,
        isPrimary: link.isPrimary,
        active: link.enabled ?? link.active ?? true,
        priority: link.priority ?? 100,
        forceProvider: link.forceProvider ?? false,
      }))
    )
  }

  clearCatalogCache()

  return { id: productId, linksCount: links.length }
}

export async function updateProductPricingRule(productId: string, input: unknown) {
  await connectDb()

  const product = await ProductModel.findById(productId).select({ _id: 1 }).lean()
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const parsed = pricingSchema.parse(input)
  const normalizedPackageMargins = Object.fromEntries(
    Object.entries(parsed.packageMarginOverrides).map(([key, value]) => [key, normalizePercent(value)])
  )

  await ProductPricingRuleModel.findOneAndUpdate(
    { productId },
    {
      defaultMarginPct: normalizePercent(parsed.defaultMarginPct),
      countMarginPct: normalizePercent(parsed.countMarginPct),
      roundingMode: parsed.roundingMode,
      isDiscountEnabled: parsed.isDiscountEnabled,
      customerDiscountPct: normalizePercent(parsed.customerDiscountPct),
      packageMarginOverrides: normalizedPackageMargins,
    },
    { upsert: true }
  )

  clearCatalogCache()

  return { id: productId }
}

export async function deleteAdminProduct(productId: string) {
  await connectDb()

  await Promise.all([
    ProductModel.findByIdAndDelete(productId),
    ProductPricingRuleModel.deleteMany({ productId }),
    ProductProviderLinkModel.deleteMany({ productId }),
  ])

  clearCatalogCache()

  return { id: productId }
}

export async function getAdminProductPreview(productId: string) {
  await connectDb()

  const product = (await ProductModel.findById(productId).select({ slug: 1, kind: 1 }).lean()) as any
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const detail = await getCatalogDetailBySlug(product.slug)
  return { detail }
}


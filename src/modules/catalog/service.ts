import { InMemoryTTLCache, dedupeRequest } from '@/modules/cache/memory'
import { connectDb } from '@/modules/db/connection'
import {
  ProductModel,
  ProductPricingRuleModel,
  ProductProviderLinkModel,
  ProviderCatalogCacheModel,
} from '@/domain/models'
import { calculateCountTotal, calculateFinalPrice } from '@/modules/pricing/engine'
import { normalizePercent } from '@/core/percent'
import { resolveStock } from '@/modules/stock/engine'
import { ensureProviderCatalogFresh } from '@/modules/providers/catalog-sync'
import { createDatabaseUnavailableError, isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import type { CatalogDetail, CatalogListItem, DisplayPackage } from '@/domain/types/catalog'
import {
  getSupabaseProductBySlug,
  listSupabasePricingRules,
  listSupabaseProducts,
  listSupabaseProviderCatalogCaches,
  listSupabaseProviderLinks,
} from '@/modules/supabase/catalog-store'
import { isSupabaseNotReadyError, isSupabaseUnavailableError } from '@/modules/supabase/documents'

type ProviderCostMap = Map<
  string,
  { cost: number; available: boolean; min?: number | null; max?: number | null; step?: number | null }
>
type ProviderLinkOption = {
  provider: string
  providerProductId: string
  providerVariantId: string | null
  priority?: number
  forceProvider?: boolean
  isPrimary?: boolean
  active?: boolean
  enabled?: boolean
}

const listCache = new InMemoryTTLCache<CatalogListItem[]>()
const detailCache = new InMemoryTTLCache<CatalogDetail>()

function normalizeCatalogImage(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const prefixedMatch = raw.match(/^image:\s*["']?(.+?)["']?$/i)
  const normalized = (prefixedMatch?.[1] ?? raw).replace(/^["']|["']$/g, '').trim()
  if (!normalized || normalized === 'null' || normalized === 'undefined') return null

  if (
    normalized.startsWith('/') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:')
  ) {
    return normalized
  }

  return normalized.startsWith('images/') ? `/${normalized}` : normalized
}

function linkKey(provider: string, productId: string, variantId: string | null) {
  return `${provider}:${productId}:${variantId ?? ''}`
}

async function getProviderCostMap() {
  if (isSupabaseProvider()) {
    const rows = await listSupabaseProviderCatalogCaches()
    const map: ProviderCostMap = new Map()
    for (const row of rows) {
      const products = Array.isArray(row.products) ? row.products : []
      for (const product of products as Array<{
        productId: string
        variantId?: string
        cost: number
        available: boolean
        min?: number | null
        max?: number | null
        step?: number | null
      }>) {
        map.set(linkKey(row.provider, product.productId, product.variantId ?? null), {
          cost: product.cost,
          available: product.available,
          min: product.min ?? null,
          max: product.max ?? null,
          step: product.step ?? null,
        })
      }
    }

    return map
  }

  if (!isMongoEnabled()) return new Map()

  await ensureProviderCatalogFresh('daily_card')
  const rows = await ProviderCatalogCacheModel.find({ expiresAt: { $gt: new Date() } })
    .select({ provider: 1, products: 1 })
    .lean()

  const map: ProviderCostMap = new Map()
  for (const row of rows) {
    const products = Array.isArray(row.products) ? row.products : []
    for (const product of products as Array<{
      productId: string
      variantId?: string
      cost: number
      available: boolean
      min?: number | null
      max?: number | null
      step?: number | null
    }>) {
      map.set(linkKey(row.provider, product.productId, product.variantId ?? null), {
        cost: product.cost,
        available: product.available,
        min: product.min ?? null,
        max: product.max ?? null,
        step: product.step ?? null,
      })
    }
  }

  return map
}

function packagePrice(
  productId: string,
  packageKey: string,
  providerLinksByKey: Map<string, ProviderLinkOption[]>,
  providerCostMap: ProviderCostMap,
  routingMode: 'manual_only' | 'provider_only' | 'cheapest_with_fallback',
  marginPercent: number,
  roundingMode: 'nearest_0_01' | 'nearest_0_05' | 'nearest_1_00',
  customerDiscountPercent: number,
  manualPriceMinor: number | null,
  manualStock: number | null
) {
  const link = selectProviderLink(routingMode, providerLinksByKey.get(packageKey) ?? [], providerCostMap)
  const providerQuote = link
    ? providerCostMap.get(linkKey(link.provider, link.providerProductId, link.providerVariantId))
    : null

  const rawCost = providerQuote ? providerQuote.cost : manualPriceMinor !== null ? manualPriceMinor / 100 : 0

  const pricing = calculateFinalPrice({
    rawCost,
    marginPercent,
    customerDiscountPercent,
    roundingMode,
  })

  const available = resolveStock({
    providerAvailable: routingMode === 'manual_only' ? null : providerQuote?.available ?? null,
    manualStock,
    isManualProduct: routingMode === 'manual_only',
    active: true,
    visible: true,
  })

  return { pricing, available }
}

function selectProviderLink(
  routingMode: 'manual_only' | 'provider_only' | 'cheapest_with_fallback',
  links: ProviderLinkOption[],
  providerCostMap: ProviderCostMap
) {
  const enabledLinks = links.filter((link) => (link.enabled ?? link.active ?? true) !== false)
  if (routingMode === 'manual_only' || enabledLinks.length === 0) return null

  if (routingMode === 'cheapest_with_fallback') {
    const ranked = enabledLinks
      .map((link) => {
        const quote = providerCostMap.get(linkKey(link.provider, link.providerProductId, link.providerVariantId))
        return {
          link,
          cost: quote?.cost ?? Number.POSITIVE_INFINITY,
          available: quote?.available ?? false,
        }
      })
      .sort((a, b) => a.cost - b.cost)

    const availableFirst = ranked.find((row) => row.available)
    return (availableFirst ?? ranked[0])?.link ?? null
  }

  const forced = enabledLinks.find((link) => link.forceProvider)
  if (forced) return forced

  return [...enabledLinks].sort((a, b) => {
    const priorityA = a.priority ?? 100
    const priorityB = b.priority ?? 100
    if (priorityA !== priorityB) return priorityA - priorityB
    return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))
  })[0]
}

function buildLinksByKey(links: any[]) {
  const map = new Map<string, ProviderLinkOption[]>()
  for (const link of links) {
    const key = link.packageKey ?? '__default__'
    const arr = map.get(key) ?? []
    arr.push({
      provider: link.provider,
      providerProductId: link.providerProductId,
      providerVariantId: link.providerVariantId ?? null,
      priority: link.priority ?? 100,
      forceProvider: link.forceProvider ?? false,
      isPrimary: link.isPrimary ?? false,
      active: link.active ?? true,
      enabled: link.enabled ?? undefined,
    })
    map.set(key, arr)
  }
  return map
}

function resolvePackageMarginPercent(
  packageMarginOverrides: unknown,
  packageKey: string,
  fallbackMarginPercent: number
) {
  if (!packageMarginOverrides) return fallbackMarginPercent

  if (packageMarginOverrides instanceof Map) {
    const mapValue = packageMarginOverrides.get(packageKey)
    return normalizePercent(mapValue ?? fallbackMarginPercent)
  }

  if (typeof packageMarginOverrides === 'object') {
    const objValue = (packageMarginOverrides as Record<string, number>)[packageKey]
    return normalizePercent(objValue ?? fallbackMarginPercent)
  }

  return fallbackMarginPercent
}

function resolveManualCountUnitPrice(countConfig: any) {
  const manualUnitPrice = countConfig?.manualUnitPrice
  if (typeof manualUnitPrice === 'number' && Number.isFinite(manualUnitPrice)) return manualUnitPrice

  const legacyMinor = countConfig?.manualUnitPriceMinor
  if (typeof legacyMinor === 'number' && Number.isFinite(legacyMinor)) return legacyMinor / 100

  return 0
}

export function clearCatalogCache() {
  listCache.clear()
  detailCache.clear()
}

export async function getCatalogList(options?: { fresh?: boolean }) {
  if (!isMongoEnabled() && !isSupabaseProvider()) return []

  const useFreshData = options?.fresh === true

  if (!useFreshData) {
    const cached = listCache.get('catalog:list')
    if (cached) return cached
  }

  return dedupeRequest(useFreshData ? 'catalog:list:fresh' : 'catalog:list', async () => {
    let productsRaw: any[] = []
    let rules: any[] = []
    let links: any[] = []
    let providerCostMap: ProviderCostMap = new Map()

    try {
      ;[productsRaw, rules, links, providerCostMap] = await Promise.all(
        isSupabaseProvider()
          ? [
              listSupabaseProducts(),
              listSupabasePricingRules(),
              listSupabaseProviderLinks(),
              getProviderCostMap(),
            ]
          : [
              (async () => {
                await connectDb()
                return (await ProductModel.find({ visible: true, active: true, hiddenFromCustomer: { $ne: true } })
                  .select({
                    slug: 1,
                    name: 1,
                    description: 1,
                    thumbnail: 1,
                    kind: 1,
                    category: 1,
                    forceOutOfStock: 1,
                    packages: 1,
                    manualStock: 1,
                    countConfig: 1,
                    routingMode: 1,
                    bestsellerRank: 1,
                  })
                  .sort({ bestsellerRank: 1, createdAt: -1 })
                  .lean()) as any[]
              })(),
              (async () => ProductPricingRuleModel.find({}).lean() as Promise<any[]>)(),
              (async () => ProductProviderLinkModel.find({ active: true }).lean() as Promise<any[]>)(),
              getProviderCostMap(),
            ]
      )
    } catch (error) {
      if (isSupabaseProvider() && (isSupabaseNotReadyError(error) || isSupabaseUnavailableError(error))) {
        return []
      }
      throw error
    }

    const products = (productsRaw as any[]).filter((product) => product.visible && product.active && product.hiddenFromCustomer !== true)
    const productIds = products.map((p) => p._id)
    const scopedRules = (rules as any[]).filter((rule) => productIds.includes(rule.productId))
    const scopedLinks = (links as any[]).filter((link) => productIds.includes(link.productId) && (link.active ?? true))

    const rulesByProduct = new Map(scopedRules.map((r) => [String(r.productId), r]))
    const linksByProduct = new Map<string, typeof links>()

    for (const link of scopedLinks) {
      const key = String(link.productId)
      const existing = linksByProduct.get(key)
      if (existing) existing.push(link)
      else linksByProduct.set(key, [link])
    }

    const items: CatalogListItem[] = products.map((product) => {
      const id = String(product._id)
      const rule = rulesByProduct.get(id)
      const marginPercent = normalizePercent(rule?.defaultMarginPct ?? 15)
      const roundingMode = rule?.roundingMode ?? 'nearest_0_01'
      const discountPercent = rule?.isDiscountEnabled ? normalizePercent(rule.customerDiscountPct ?? 0) : 0
      const productLinks = linksByProduct.get(id) ?? []
      const providerLinksByKey = buildLinksByKey(productLinks as any[])

      let finalPriceFrom = 0
      let available = false

      if (product.kind === 'count') {
        const countLink = selectProviderLink(product.routingMode, providerLinksByKey.get('__default__') ?? [], providerCostMap)
        const providerQuote = countLink
          ? providerCostMap.get(linkKey(countLink.provider, countLink.providerProductId, countLink.providerVariantId))
          : null

        const isManualCount = product.routingMode === 'manual_only'
        const manualUnitPrice = resolveManualCountUnitPrice(product.countConfig)
        const rawCost = isManualCount
          ? manualUnitPrice
          : providerQuote?.cost ?? manualUnitPrice

        const pricing = calculateFinalPrice({
          rawCost,
          marginPercent: normalizePercent(rule?.countMarginPct ?? marginPercent),
          customerDiscountPercent: discountPercent,
          roundingMode,
        })

        finalPriceFrom = pricing.finalPrice
        available = resolveStock({
          providerAvailable: isManualCount ? null : providerQuote?.available ?? null,
          manualStock: product.manualStock,
          isManualProduct: isManualCount,
          active: true,
          visible: true,
        })
        if (product.forceOutOfStock) available = false
      } else {
        const firstPackage = product.packages?.[0]
        const selectedKey = firstPackage?.key ?? '__default__'
        const packageMargin = resolvePackageMarginPercent(rule?.packageMarginOverrides, selectedKey, marginPercent)
        const priceState = packagePrice(
          id,
          selectedKey,
          providerLinksByKey,
          providerCostMap,
          product.routingMode,
          packageMargin,
          roundingMode,
          discountPercent,
          firstPackage?.manualPriceMinor ?? null,
          firstPackage?.manualStock ?? null
        )

        finalPriceFrom = priceState.pricing.finalPrice
        available = resolveStock({
          providerAvailable: priceState.available,
          manualStock: product.manualStock,
          isManualProduct: product.kind === 'manual',
          active: true,
          visible: true,
        })
        if (product.forceOutOfStock) available = false
      }

      return {
        id,
        slug: product.slug,
        name: product.name,
        description: product.description ?? '',
        thumbnail: normalizeCatalogImage(product.thumbnail),
        kind: product.kind,
        finalPriceFrom,
        available,
        category: product.category,
      }
    })

    if (!useFreshData) {
      listCache.set('catalog:list', items, 30_000)
    }

    return items
  })
}

export async function getCatalogDetailBySlug(slug: string) {
  if (!isMongoEnabled() && !isSupabaseProvider()) return null

  const cacheKey = `catalog:detail:${slug}`
  const cached = detailCache.get(cacheKey)
  if (cached) return cached

  return dedupeRequest(cacheKey, async () => {
    let product: any
    try {
      product = isSupabaseProvider()
        ? await getSupabaseProductBySlug(slug)
        : ((await (async () => {
            await connectDb()
            return ProductModel.findOne({ slug, visible: true, hiddenFromCustomer: { $ne: true } })
              .select({
                slug: 1,
                name: 1,
                description: 1,
                thumbnail: 1,
                kind: 1,
                category: 1,
                forceOutOfStock: 1,
                manualStock: 1,
                packages: 1,
                countConfig: 1,
                routingMode: 1,
                active: 1,
                visible: 1,
              })
              .lean()
          })()) as any)
    } catch (error) {
      if (isSupabaseProvider() && (isSupabaseNotReadyError(error) || isSupabaseUnavailableError(error))) return null
      throw error
    }

    if (!product || product.hiddenFromCustomer === true || product.visible === false) return null

    const [rule, links, providerCostMap] = await Promise.all(
      isSupabaseProvider()
        ? [
            listSupabasePricingRules().then((rows: any[]) => rows.find((row: any) => String(row.productId) === String(product._id)) ?? null),
            listSupabaseProviderLinks().then((rows: any[]) =>
              rows.filter((row: any) => String(row.productId) === String(product._id) && (row.active ?? true))
            ),
            getProviderCostMap(),
          ]
        : [
            ProductPricingRuleModel.findOne({ productId: product._id }).lean() as Promise<any>,
            ProductProviderLinkModel.find({ productId: product._id, active: true }).lean() as Promise<any[]>,
            getProviderCostMap(),
          ]
    )

    const marginPercent = normalizePercent(rule?.defaultMarginPct ?? 15)
    const roundingMode = rule?.roundingMode ?? 'nearest_0_01'
    const discountPercent = rule?.isDiscountEnabled ? normalizePercent(rule.customerDiscountPct ?? 0) : 0
    const providerLinksByKey = buildLinksByKey(links as any[])

    const packages: DisplayPackage[] = (product.packages ?? [])
      .filter((p: any) => p.visible && p.active)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((pkg: any) => {
        const packageMargin = resolvePackageMarginPercent(rule?.packageMarginOverrides, pkg.key, marginPercent)

        const state = packagePrice(
          String(product._id),
          pkg.key,
          providerLinksByKey,
          providerCostMap,
          product.routingMode,
          packageMargin,
          roundingMode,
          discountPercent,
          pkg.manualPriceMinor ?? null,
          pkg.manualStock ?? null
        )

        return {
          key: pkg.key,
          label: pkg.label,
          finalPrice: state.pricing.finalPrice,
          available: state.available,
        }
      })

    const count =
      product.kind === 'count'
        ? (() => {
            const defaultLink = selectProviderLink(product.routingMode, providerLinksByKey.get('__default__') ?? [], providerCostMap)
            const quote = defaultLink
              ? providerCostMap.get(
                  linkKey(
                    defaultLink.provider,
                    defaultLink.providerProductId,
                    defaultLink.providerVariantId
                  )
                )
              : null
            const isManualCount = product.routingMode === 'manual_only'
            const manualUnitPrice = resolveManualCountUnitPrice(product.countConfig)
            const rawCost = isManualCount
              ? manualUnitPrice
              : quote?.cost ?? manualUnitPrice

            const countMarginPercent = normalizePercent(rule?.countMarginPct ?? marginPercent)
            const unitPrice = rawCost * (1 + countMarginPercent / 100) * (1 - discountPercent / 100)

            const resolvedMin =
              (product.routingMode === 'manual_only' ? product.countConfig?.min : quote?.min ?? product.countConfig?.min) ??
              null
            const resolvedStep =
              (product.routingMode === 'manual_only' ? product.countConfig?.step : quote?.step ?? product.countConfig?.step) ??
              1
            if (!resolvedMin) return null
            const current = resolvedMin
            const max = quote?.max ?? product.countConfig?.max ?? resolvedMin

            return {
              min: resolvedMin,
              max,
              step: resolvedStep,
              current,
              unitPrice,
              total: calculateCountTotal(unitPrice, current),
            }
          })()
        : null

    const countProviderAvailable =
      product.kind === 'count'
        ? (() => {
            if (product.routingMode === 'manual_only') return null
            const defaultLink = selectProviderLink(product.routingMode, providerLinksByKey.get('__default__') ?? [], providerCostMap)
            if (!defaultLink) return null
            return (
              providerCostMap.get(
                linkKey(defaultLink.provider, defaultLink.providerProductId, defaultLink.providerVariantId)
              )?.available ?? null
            )
          })()
        : null

    const available = resolveStock({
      providerAvailable: product.kind === 'count' ? countProviderAvailable : packages.some((p) => p.available),
      manualStock: product.manualStock,
      isManualProduct: product.kind === 'manual' || (product.kind === 'count' && product.routingMode === 'manual_only'),
      active: product.active,
      visible: product.visible,
    })
    const finalAvailable = product.forceOutOfStock ? false : available

    const detail: CatalogDetail = {
      id: String(product._id),
      slug: product.slug,
      name: product.name,
      description: product.description,
      thumbnail: normalizeCatalogImage(product.thumbnail),
      kind: product.kind,
      available: finalAvailable,
      category: product.category,
      packages,
      count,
    }

    detailCache.set(cacheKey, detail, 30_000)
    return detail
  })
}

export async function getOrderPricingSnapshot(input: { productSlug: string; packageKey?: string; countValue?: number }) {
  if (!isMongoEnabled() && !isSupabaseProvider()) throw createDatabaseUnavailableError('Order pricing')

  let product: any
  try {
    product = isSupabaseProvider()
      ? await getSupabaseProductBySlug(input.productSlug)
      : ((await (async () => {
          await connectDb()
          return ProductModel.findOne({ slug: input.productSlug, active: true, visible: true })
            .select({
              _id: 1,
              slug: 1,
              kind: 1,
              routingMode: 1,
              packages: 1,
              countConfig: 1,
            })
            .lean()
        })()) as any)
  } catch (error) {
    if (isSupabaseProvider() && (isSupabaseNotReadyError(error) || isSupabaseUnavailableError(error))) {
      throw createDatabaseUnavailableError('Order pricing')
    }
    throw error
  }

  if (!product) return null

  const [rule, links, providerCostMap] = await Promise.all(
    isSupabaseProvider()
      ? [
          listSupabasePricingRules().then((rows: any[]) => rows.find((row: any) => String(row.productId) === String(product._id)) ?? null),
          listSupabaseProviderLinks().then((rows: any[]) =>
            rows.filter((row: any) => String(row.productId) === String(product._id) && (row.active ?? true))
          ),
          getProviderCostMap(),
        ]
      : [
          ProductPricingRuleModel.findOne({ productId: product._id }).lean() as Promise<any>,
          ProductProviderLinkModel.find({ productId: product._id, active: true }).lean() as Promise<any[]>,
          getProviderCostMap(),
        ]
  )

  const marginPercent = normalizePercent(rule?.defaultMarginPct ?? 15)
  const roundingMode = rule?.roundingMode ?? 'nearest_0_01'
  const discountPercent = rule?.isDiscountEnabled ? normalizePercent(rule.customerDiscountPct ?? 0) : 0

  const providerLinksByKey = buildLinksByKey(links as any[])

  if (product.kind === 'count') {
    const defaultLink = selectProviderLink(product.routingMode, providerLinksByKey.get('__default__') ?? [], providerCostMap)
    const quote = defaultLink
      ? providerCostMap.get(
          linkKey(
            defaultLink.provider,
            defaultLink.providerProductId,
            defaultLink.providerVariantId
          )
        )
      : null
    const resolvedMin =
      (product.routingMode === 'manual_only' ? product.countConfig?.min : quote?.min ?? product.countConfig?.min) ?? 1
    const quantity = input.countValue ?? resolvedMin
    const isManualCount = product.routingMode === 'manual_only'
    const manualUnitPrice = resolveManualCountUnitPrice(product.countConfig)
    const rawCost = isManualCount
      ? manualUnitPrice
      : quote?.cost ?? manualUnitPrice

    const totalPricing = calculateFinalPrice({
      rawCost: rawCost * quantity,
      marginPercent: normalizePercent(rule?.countMarginPct ?? marginPercent),
      customerDiscountPercent: discountPercent,
      roundingMode,
    })
    const unitFinalPrice = quantity > 0 ? totalPricing.finalPrice / quantity : 0

    return {
      productId: String(product._id),
      kind: product.kind as 'count',
      packageKey: null,
      quantity,
      unitRawCost: rawCost,
      unitFinalPrice,
      totalRawCost: rawCost * quantity,
      totalFinalPrice: totalPricing.finalPrice,
    }
  }

  const selectedPackageKey = input.packageKey ?? product.packages?.[0]?.key ?? '__default__'
  const selectedPackage = (product.packages ?? []).find((pkg: any) => pkg.key === selectedPackageKey)
  const packageMargin = resolvePackageMarginPercent(rule?.packageMarginOverrides, selectedPackageKey, marginPercent)
  const state = packagePrice(
    String(product._id),
    selectedPackageKey,
    providerLinksByKey,
    providerCostMap,
    product.routingMode,
    packageMargin,
    roundingMode,
    discountPercent,
    selectedPackage?.manualPriceMinor ?? null,
    selectedPackage?.manualStock ?? null
  )

  return {
    productId: String(product._id),
    kind: product.kind as 'package' | 'manual',
    packageKey: selectedPackageKey === '__default__' ? null : selectedPackageKey,
    quantity: 1,
    unitRawCost: state.pricing.rawCost,
    unitFinalPrice: state.pricing.finalPrice,
    totalRawCost: state.pricing.rawCost,
    totalFinalPrice: state.pricing.finalPrice,
  }
}



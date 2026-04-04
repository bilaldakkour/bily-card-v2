import { randomUUID } from 'node:crypto'
import { deleteDocument, getDocumentById, getDocumentBySlug, queryDocuments, writeDocument } from './documents'

function normalizeImagePath(value: unknown) {
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

export function normalizeSupabaseCountConfig(
  countConfig:
    | {
        min?: number | null
        max?: number | null
        step?: number | null
        manualUnitPrice?: number | null
        manualUnitPriceMinor?: number | null
      }
    | null
    | undefined
) {
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

export function mapSupabaseProduct(row: any) {
  return {
    _id: row.id,
    slug: row.slug ?? row.payload?.slug,
    name: row.payload?.name ?? '',
    description: row.payload?.description ?? '',
    thumbnail: normalizeImagePath(row.payload?.thumbnail),
    kind: row.payload?.kind ?? 'package',
    category: row.payload?.category ?? '',
    visible: row.is_visible ?? row.payload?.visible ?? true,
    hiddenFromCustomer: row.payload?.hiddenFromCustomer ?? false,
    active: row.is_active ?? row.payload?.active ?? true,
    forceOutOfStock: row.payload?.forceOutOfStock ?? false,
    routingMode: row.payload?.routingMode ?? 'manual_only',
    manualStock: row.payload?.manualStock ?? null,
    countConfig: normalizeSupabaseCountConfig(row.payload?.countConfig),
    packages: Array.isArray(row.payload?.packages) ? row.payload.packages : [],
    updatedAt: row.updated_at ?? null,
    createdAt: row.created_at ?? null,
  }
}

export function mapSupabasePricingRule(row: any) {
  return {
    _id: row.id,
    productId: row.payload?.productId ?? row.slug ?? '',
    defaultMarginPct: row.payload?.defaultMarginPct ?? 15,
    countMarginPct: row.payload?.countMarginPct ?? 15,
    roundingMode: row.payload?.roundingMode ?? 'nearest_0_01',
    isDiscountEnabled: row.payload?.isDiscountEnabled ?? false,
    customerDiscountPct: row.payload?.customerDiscountPct ?? 0,
    packageMarginOverrides: row.payload?.packageMarginOverrides ?? {},
    updatedAt: row.updated_at ?? null,
  }
}

export function mapSupabaseProviderLink(row: any) {
  return {
    _id: row.id,
    productId: row.payload?.productId ?? '',
    packageKey: row.payload?.packageKey ?? null,
    provider: row.payload?.provider ?? 'daily_card',
    providerProductId: row.payload?.providerProductId ?? '',
    providerVariantId: row.payload?.providerVariantId ?? null,
    isPrimary: row.payload?.isPrimary ?? true,
    active: row.is_active ?? row.payload?.active ?? true,
    enabled: row.payload?.enabled ?? undefined,
    priority: row.payload?.priority ?? 100,
    forceProvider: row.payload?.forceProvider ?? false,
  }
}

export function mapSupabaseProviderCatalogCache(row: any) {
  return {
    _id: row.id,
    provider: row.payload?.provider ?? '',
    products: Array.isArray(row.payload?.products) ? row.payload.products : [],
    fetchedAt: row.payload?.fetchedAt ?? null,
    expiresAt: row.payload?.expiresAt ? new Date(row.payload.expiresAt) : new Date(0),
  }
}

export async function listSupabaseProducts() {
  const rows = await queryDocuments('products')
  return rows.map(mapSupabaseProduct)
}

export async function getSupabaseProductById(id: string) {
  const row = await getDocumentById('products', id)
  return row ? mapSupabaseProduct(row) : null
}

export async function getSupabaseProductBySlug(slug: string) {
  const row = await getDocumentBySlug('products', slug)
  return row ? mapSupabaseProduct(row) : null
}

export async function saveSupabaseProduct(input: {
  id?: string
  slug: string
  visible: boolean
  active: boolean
  payload: Record<string, any>
}) {
  const row = await writeDocument({
    id: input.id,
    collection: 'products',
    slug: input.slug,
    isActive: input.active,
    isVisible: input.visible,
    payload: input.payload,
  })

  return mapSupabaseProduct(row)
}

export async function deleteSupabaseProductById(id: string) {
  await deleteDocument('products', id)
}

export async function listSupabasePricingRules() {
  const rows = await queryDocuments('product_pricing_rules')
  return rows.map(mapSupabasePricingRule)
}

export async function saveSupabasePricingRule(productId: string, payload: Record<string, any>) {
  const existing = await getDocumentBySlug('product_pricing_rules', productId)
  const row = await writeDocument({
    id: existing?.id,
    collection: 'product_pricing_rules',
    slug: productId,
    payload: {
      ...payload,
      productId,
    },
  })

  return mapSupabasePricingRule(row)
}

export async function listSupabaseProviderLinks() {
  const rows = await queryDocuments('product_provider_links')
  return rows.map(mapSupabaseProviderLink)
}

export async function replaceSupabaseProviderLinks(productId: string, links: Array<Record<string, any>>) {
  const existing = await queryDocuments('product_provider_links')
  const toDelete = existing.filter((row: any) => row.payload?.productId === productId)
  for (const row of toDelete as any[]) {
    await deleteDocument('product_provider_links', row.id)
  }

  const created = []
  for (const link of links) {
    created.push(
      await writeDocument({
        id: randomUUID(),
        collection: 'product_provider_links',
        slug: `${productId}:${link.packageKey ?? 'default'}:${link.provider}:${link.providerProductId}:${link.providerVariantId ?? ''}`,
        isActive: link.active ?? link.enabled ?? true,
        payload: {
          ...link,
          productId,
        },
      })
    )
  }

  return created.map(mapSupabaseProviderLink)
}

export async function listSupabaseProviderCatalogCaches() {
  const rows = await queryDocuments('provider_catalog_cache')
  return rows.map(mapSupabaseProviderCatalogCache)
}

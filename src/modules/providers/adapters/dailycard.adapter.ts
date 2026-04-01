import { env } from '@/core/env'
import type { ProviderAdapter, ProviderOrderInput, ProviderOrderResult, ProviderOrderStatusResult, ProviderProductQuote } from '@/modules/providers/types'

export type DailyCatalogProduct = {
  productId: string
  variantId: string | null
  cost: number
  available: boolean
  min?: number | null
  max?: number | null
  step?: number | null
  name?: string | null
  category?: string | null
  raw?: unknown
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

async function fetchDaily<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.DAILY_CARD_BASE_URL || !env.DAILY_CARD_API_KEY || !env.DAILY_CARD_API_SECRET) {
    throw new Error('DailyCard credentials are not configured')
  }

  const response = await fetch(`${normalizeBaseUrl(env.DAILY_CARD_BASE_URL)}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.DAILY_CARD_API_KEY,
      'X-API-Secret': env.DAILY_CARD_API_SECRET,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Provider request failed')
  }

  return response.json() as Promise<T>
}

function asNumber(value: unknown) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function pickArray(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  for (const key of ['results', 'items', 'products', 'data']) {
    if (Array.isArray(record[key])) return record[key] as any[]

    if (record[key] && typeof record[key] === 'object') {
      const nested = record[key] as Record<string, unknown>
      for (const nestedKey of ['results', 'items', 'products']) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as any[]
      }
    }
  }

  return []
}

function normalizeCatalogProduct(row: Record<string, unknown>): DailyCatalogProduct | null {
  const productIdValue = row.providerProductId ?? row.product_id ?? row.productId ?? row.id ?? row.pk
  if (productIdValue === null || productIdValue === undefined || productIdValue === '') return null

  const variantRaw =
    row.variant_id ??
    row.variantId ??
    row.variant_code ??
    row.variantCode ??
    row.variantLabel ??
    row.variant_label ??
    null

  const cost =
    asNumber(row.price) ??
    asNumber(row.cost) ??
    asNumber(row.sell_price) ??
    asNumber(row.base_price) ??
    asNumber(row.unit_price) ??
    0

  const numericStock = asNumber(row.stock)
  const available =
    typeof row.available === 'boolean'
      ? row.available
      : typeof row.in_stock === 'boolean'
        ? row.in_stock
        : numericStock !== null
          ? numericStock > 0
          : ['available', 'active'].includes(String(row.status ?? '').toLowerCase())

  const qtyValues =
    row.qty_values && typeof row.qty_values === 'object'
      ? (row.qty_values as Record<string, unknown>)
      : null

  return {
    productId: String(productIdValue),
    variantId: variantRaw === null || variantRaw === undefined || variantRaw === '' ? null : String(variantRaw),
    cost,
    available,
    min:
      asNumber(row.min) ??
      asNumber(row.min_qty) ??
      asNumber(row.minQty) ??
      asNumber(row.minimum) ??
      asNumber(row.minimum_quantity) ??
      asNumber(qtyValues?.min),
    max:
      asNumber(row.max) ??
      asNumber(row.max_qty) ??
      asNumber(row.maxQty) ??
      asNumber(row.maximum) ??
      asNumber(row.maximum_quantity) ??
      asNumber(qtyValues?.max),
    step: asNumber(row.step) ?? asNumber(row.qty_step) ?? asNumber(row.increment) ?? asNumber(qtyValues?.step),
    name: typeof row.productName === 'string' ? row.productName : typeof row.name === 'string' ? row.name : null,
    category: typeof row.category === 'string' ? row.category : null,
    raw: row,
  }
}

export async function fetchDailyCardCatalog(): Promise<DailyCatalogProduct[]> {
  const products: DailyCatalogProduct[] = []
  const pageSize = 100
  let page = 1

  while (true) {
    const payload = await fetchDaily<any>(`/api-keys/products/?page=${page}&page_size=${pageSize}`, { method: 'GET' })
    const rows = pickArray(payload)
    products.push(
      ...rows
        .map((row) => normalizeCatalogProduct((row ?? {}) as Record<string, unknown>))
        .filter((item): item is DailyCatalogProduct => Boolean(item))
    )

    const hasNext =
      typeof payload?.next === 'number'
        ? payload.next > page
        : typeof payload?.next === 'string'
          ? payload.next.length > 0
          : rows.length === pageSize

    if (!hasNext) break
    page += 1
  }

  return products
}

export class DailyCardAdapter implements ProviderAdapter {
  readonly name = 'daily_card' as const

  async getOrderStatus(providerRef: string): Promise<ProviderOrderStatusResult> {
    const payload = await fetchDaily<any>(`/api-keys/orders/status/?transaction_id=${encodeURIComponent(providerRef)}`, {
      method: 'GET',
    })

    const rawStatus =
      payload?.status ??
      payload?.order_status ??
      payload?.data?.status ??
      payload?.data?.order_status ??
      payload?.result?.status ??
      payload?.result?.order_status

    const normalized = String(rawStatus ?? '').toLowerCase()

    if (normalized === 'completed') {
      return { success: true, status: 'completed' }
    }

    if (normalized === 'cancelled' || normalized === 'canceled') {
      return { success: true, status: 'cancelled' }
    }

    if (normalized === 'pending' || normalized === 'processing') {
      return { success: true, status: 'pending' }
    }

    return {
      success: false,
      errorCode: payload?.error_code ?? 'PROVIDER_STATUS_UNKNOWN',
    }
  }

  async getQuote(input: ProviderOrderInput): Promise<ProviderProductQuote | null> {
    const items = await fetchDailyCardCatalog()
    const wantedId = input.providerVariantId ?? input.providerProductId
    const match =
      items.find((item) => item.productId === wantedId) ??
      items.find((item) => item.productId === input.providerProductId && item.variantId === (input.providerVariantId ?? null))

    if (!match) return null

    return {
      provider: this.name,
      productId: match.productId,
      variantId: match.variantId,
      cost: match.cost,
      available: match.available,
    }
  }

  async placeOrder(input: ProviderOrderInput): Promise<ProviderOrderResult> {
    const data = await fetchDaily<{ transaction_id?: string; order_id?: number; client_order_id?: string; error_code?: string }>(
      '/api-keys/orders/create/',
      {
        method: 'POST',
        body: JSON.stringify({
          product: input.providerVariantId ?? input.providerProductId,
          account_id: input.account,
          quantity: input.amount,
        }),
      }
    )

    if (!data?.transaction_id && !data?.order_id && !data?.client_order_id) {
      return { success: false, errorCode: data?.error_code ?? 'PROVIDER_ORDER_FAILED' }
    }

    return { success: true, providerRef: String(data.transaction_id ?? data.order_id ?? data.client_order_id) }
  }
}

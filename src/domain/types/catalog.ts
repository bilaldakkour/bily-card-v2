export type ProductKind = 'package' | 'count' | 'manual'
export type RoutingMode = 'manual_only' | 'provider_only' | 'cheapest_with_fallback'
export type ProviderName = 'daily_card' | 'go4_card'
export type ProductAvailability = 'in_stock' | 'out_of_stock'

export type DisplayPackage = {
  key: string
  label: string
  finalPrice: number
  available: boolean
}

export type DisplayCount = {
  min: number
  max: number
  step: number
  current: number
  unitPrice: number
  total: number
}

export type CatalogListItem = {
  id: string
  slug: string
  name: string
  description: string
  thumbnail: string | null
  kind: ProductKind
  finalPriceFrom: number
  available: boolean
  category: string
}

export type CatalogDetail = {
  id: string
  slug: string
  name: string
  description: string
  thumbnail: string | null
  kind: ProductKind
  available: boolean
  category: string
  packages: DisplayPackage[]
  count: DisplayCount | null
}


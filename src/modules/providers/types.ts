export type ProviderProductQuote = {
  provider: 'daily_card' | 'go4_card'
  productId: string
  variantId: string | null
  cost: number
  available: boolean
}

export type ProviderOrderInput = {
  providerProductId: string
  providerVariantId?: string | null
  account: string
  amount?: number
}

export type ProviderOrderResult = {
  success: boolean
  providerRef?: string
  errorCode?: string
}

export type ProviderOrderStatusResult = {
  success: boolean
  status?: 'pending' | 'completed' | 'cancelled'
  errorCode?: string
}

export interface ProviderAdapter {
  readonly name: 'daily_card' | 'go4_card'
  getQuote(input: ProviderOrderInput): Promise<ProviderProductQuote | null>
  placeOrder(input: ProviderOrderInput): Promise<ProviderOrderResult>
  getOrderStatus(providerRef: string): Promise<ProviderOrderStatusResult>
}


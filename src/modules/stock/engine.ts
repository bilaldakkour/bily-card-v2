export type StockInput = {
  providerAvailable: boolean | null
  manualStock: number | null
  isManualProduct: boolean
  active: boolean
  visible: boolean
}

export function resolveStock(input: StockInput) {
  if (!input.visible || !input.active) return false

  if (input.isManualProduct) {
    if (input.manualStock === null) return true
    return input.manualStock > 0
  }

  if (input.manualStock !== null) return input.manualStock > 0
  return Boolean(input.providerAvailable)
}


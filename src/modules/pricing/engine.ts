import { roundVisible } from '@/core/money'

import { normalizePercent } from '@/core/percent'

export type PricingInput = {
  rawCost: number
  marginPercent: number
  customerDiscountPercent?: number
  roundingMode?: 'nearest_0_01' | 'nearest_0_05' | 'nearest_1_00'
}

export type PricingOutput = {
  rawCost: number
  marginPercent: number
  discountPercent: number
  subtotal: number
  finalPrice: number
}

function applyRounding(value: number, mode: PricingInput['roundingMode']) {
  if (mode === 'nearest_0_05') return Math.round(value * 20) / 20
  if (mode === 'nearest_1_00') return Math.round(value)
  return Math.round(value * 100) / 100
}

export function calculateFinalPrice(input: PricingInput): PricingOutput {
  const marginPercent = normalizePercent(input.marginPercent)
  const discountPercent = normalizePercent(input.customerDiscountPercent ?? 0)

  const subtotal = input.rawCost * (1 + marginPercent / 100)
  const discounted = subtotal * (1 - discountPercent / 100)
  const finalPrice = applyRounding(discounted, input.roundingMode)

  return {
    rawCost: roundVisible(input.rawCost),
    marginPercent,
    discountPercent,
    subtotal: roundVisible(subtotal),
    finalPrice,
  }
}

export function calculateCountTotal(unitPrice: number, quantity: number) {
  return roundVisible(unitPrice * quantity)
}


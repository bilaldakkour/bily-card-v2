export const MONEY_SCALE = 100

export function toMinor(amount: number) {
  return Math.round(amount * MONEY_SCALE)
}

export function fromMinor(minor: number) {
  return minor / MONEY_SCALE
}

export function roundVisible(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}


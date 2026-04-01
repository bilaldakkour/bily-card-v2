export function minorToDecimal(minor: number | null | undefined) {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return 0
  return minor / 100
}

export function decimalToMinor(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return 0
  return Math.round(normalized * 100)
}

export function formatPrice(value: number | string | null | undefined) {
  const normalized = Number(value ?? 0)
  if (!Number.isFinite(normalized)) return '0.00'
  return normalized.toFixed(2)
}

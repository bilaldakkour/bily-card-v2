export function normalizePercent(value: number) {
  if (!Number.isFinite(value)) return 0
  if (value >= 0 && value <= 1) return value * 100
  return value
}

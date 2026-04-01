import type { ProviderAdapter } from '@/modules/providers/types'
import { DailyCardAdapter } from '@/modules/providers/adapters/dailycard.adapter'

const adapters: Record<string, ProviderAdapter> = {
  daily_card: new DailyCardAdapter(),
}

export function getProviderAdapter(name: string) {
  const adapter = adapters[name]
  if (!adapter) {
    throw new Error(`Provider adapter not found: ${name}`)
  }
  return adapter
}


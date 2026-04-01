import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { syncProviderCatalog } from '@/modules/providers/catalog-sync'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = (await request.json()) as { provider?: 'daily_card' | 'go4_card' }
    const provider = body.provider ?? 'daily_card'
    const result = await syncProviderCatalog(provider)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

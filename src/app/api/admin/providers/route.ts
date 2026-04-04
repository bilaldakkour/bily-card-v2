import { fail, ok } from '@/core/http'
import { listProviderSettings, saveProviderSettings } from '@/features/admin/providers.service'
import { requireAdmin } from '@/modules/security/guards'

export async function GET() {
  try {
    await requireAdmin()
    const settings = await listProviderSettings()
    return ok(settings)
  } catch (error) {
    return fail(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const body = (await request.json()) as {
      provider: 'daily_card' | 'go4_card'
      baseUrl: string
      enabled: boolean
      timeoutMs: number
    }

    await saveProviderSettings(body)

    return ok({ success: true })
  } catch (error) {
    return fail(error)
  }
}

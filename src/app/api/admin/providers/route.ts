import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { connectDb } from '@/modules/db/connection'
import { ProviderSettingsModel } from '@/domain/models'

export async function GET() {
  try {
    await requireAdmin()
    await connectDb()
    const settings = await ProviderSettingsModel.find({})
      .select({ provider: 1, baseUrl: 1, enabled: 1, timeoutMs: 1, updatedAt: 1 })
      .sort({ provider: 1 })
      .lean()
    return ok(settings)
  } catch (error) {
    return fail(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    await connectDb()
    const body = (await request.json()) as {
      provider: 'daily_card' | 'go4_card'
      baseUrl: string
      enabled: boolean
      timeoutMs: number
    }

    await ProviderSettingsModel.findOneAndUpdate(
      { provider: body.provider },
      {
        provider: body.provider,
        baseUrl: body.baseUrl,
        enabled: body.enabled,
        timeoutMs: body.timeoutMs,
      },
      { upsert: true }
    )

    return ok({ success: true })
  } catch (error) {
    return fail(error)
  }
}

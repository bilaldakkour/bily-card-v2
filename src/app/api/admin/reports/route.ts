import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { buildReports } from '@/features/admin/reports.service'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? 'today'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const data = await buildReports(range, from, to)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { getOrdersForAdmin } from '@/features/orders/service'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const page = Number(searchParams.get('page') ?? '1')
    const pageSize = Number(searchParams.get('pageSize') ?? '30')
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    const data = await getOrdersForAdmin({ status, page, pageSize, from, to })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { getDepositRequestsForAdmin } from '@/features/wallet/service'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null) ?? undefined

    const data = await getDepositRequestsForAdmin(status)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

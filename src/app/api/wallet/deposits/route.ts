import { fail, ok } from '@/core/http'
import { requireAuth } from '@/modules/security/guards'
import { getDepositRequestsForUser } from '@/features/wallet/service'

export async function GET() {
  try {
    const session = await requireAuth()
    const deposits = await getDepositRequestsForUser(session.sub)
    return ok(deposits)
  } catch (error) {
    return fail(error)
  }
}

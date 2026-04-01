import { fail, ok } from '@/core/http'
import { requireAuth } from '@/modules/security/guards'
import { getOrderDetailForUser } from '@/features/orders/service'

export async function GET(_request: Request, ctx: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const data = await getOrderDetailForUser(ctx.params.id, session.sub)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

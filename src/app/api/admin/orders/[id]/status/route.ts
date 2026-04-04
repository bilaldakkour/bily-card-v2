import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { updateOrderDecisionByAdmin } from '@/features/orders/service'

const schema = z.object({
  action: z.enum(['accept', 'reject']),
})

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    const body = schema.parse(await request.json())
    const data = await updateOrderDecisionByAdmin({
      orderId: ctx.params.id,
      action: body.action,
      adminId: session.sub,
    })
    for (const path of ['/admin', '/admin/orders', '/admin/manual-orders', '/admin/reports']) {
      revalidatePath(path)
    }
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

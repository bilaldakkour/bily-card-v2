import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { updateManualOrderStatusByAdmin } from '@/features/orders/service'

const schema = z.object({
  status: z.enum(['pending', 'processing', 'done', 'cancelled']),
  note: z.string().optional(),
})

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    const body = schema.parse(await request.json())

    const data = await updateManualOrderStatusByAdmin({
      manualOrderId: ctx.params.id,
      adminId: admin.sub,
      status: body.status,
      note: body.note,
    })

    for (const path of ['/admin', '/admin/orders', '/admin/manual-orders', '/admin/reports']) {
      revalidatePath(path)
    }
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

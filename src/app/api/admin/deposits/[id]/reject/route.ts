import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { rejectDeposit } from '@/features/wallet/service'

const schema = z.object({ note: z.string().optional() })

export async function POST(request: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    const body = schema.parse(await request.json())
    const data = await rejectDeposit({ depositId: ctx.params.id, adminId: admin.sub, note: body.note })
    for (const path of ['/admin', '/admin/deposits', '/admin/orders', '/admin/reports']) {
      revalidatePath(path)
    }
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

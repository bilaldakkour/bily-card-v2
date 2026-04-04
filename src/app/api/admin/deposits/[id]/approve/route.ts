import { revalidatePath } from 'next/cache'
import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { approveDeposit } from '@/features/wallet/service'

export async function POST(_request: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    await approveDeposit(ctx.params.id, admin.sub)
    for (const path of ['/admin', '/admin/deposits', '/admin/orders', '/admin/reports']) {
      revalidatePath(path)
    }
    return ok({ success: true })
  } catch (error) {
    return fail(error)
  }
}

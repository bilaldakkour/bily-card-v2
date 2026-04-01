import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { getAdminProductPreview } from '@/features/admin/products.service'

export async function GET(_request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const result = await getAdminProductPreview(ctx.params.id)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

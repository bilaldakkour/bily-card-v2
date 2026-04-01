import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { deleteAdminProduct, updateAdminProduct } from '@/features/admin/products.service'

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const result = await updateAdminProduct(ctx.params.id, body)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const result = await deleteAdminProduct(ctx.params.id)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { replaceProductPackages } from '@/features/admin/products.service'

export async function PUT(request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const result = await replaceProductPackages(ctx.params.id, body.packages ?? [])
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

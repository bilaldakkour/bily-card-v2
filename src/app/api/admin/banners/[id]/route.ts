import { fail, ok } from '@/core/http'
import { deleteHomeBanner, updateHomeBanner } from '@/features/home/banner.service'
import { requireAdmin } from '@/modules/security/guards'

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const banner = await updateHomeBanner(context.params.id, body)
    return ok(banner)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    await requireAdmin()
    const result = await deleteHomeBanner(context.params.id)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

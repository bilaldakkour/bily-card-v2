import { fail, ok } from '@/core/http'
import { getCatalogDetailBySlug } from '@/modules/catalog/service'

export async function GET(_request: Request, ctx: { params: { slug: string } }) {
  try {
    const detail = await getCatalogDetailBySlug(ctx.params.slug)
    if (!detail) {
      return Response.json({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, { status: 404 })
    }
    return ok(detail)
  } catch (error) {
    return fail(error)
  }
}


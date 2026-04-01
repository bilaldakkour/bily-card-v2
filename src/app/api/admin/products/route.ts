import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { createAdminProduct, listAdminProducts } from '@/features/admin/products.service'

export async function GET() {
  try {
    await requireAdmin()
    const products = await listAdminProducts()
    return ok(products)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const result = await createAdminProduct(body)
    return ok(result, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}

import { fail, ok } from '@/core/http'
import { getCatalogList } from '@/modules/catalog/service'

export async function GET() {
  try {
    const list = await getCatalogList()
    return ok(list)
  } catch (error) {
    return fail(error)
  }
}


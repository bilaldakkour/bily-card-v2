import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requireAuth } from '@/modules/security/guards'
import { getCustomerOrders, placeOrder } from '@/features/orders/service'

const schema = z.object({
  productSlug: z.string().min(1),
  account: z.string().min(2),
  packageKey: z.string().optional(),
  countValue: z.number().int().positive().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') ?? '1')
    const pageSize = Number(searchParams.get('pageSize') ?? '20')

    const data = await getCustomerOrders(session.sub, page, pageSize)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const json = await request.json()
    const input = schema.parse(json)

    const result = await placeOrder({ userId: session.sub, ...input })
    return ok(result, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}

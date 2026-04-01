import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { createManualOrderByAdmin, getManualOrdersForAdmin } from '@/features/orders/service'
import { requireAdmin } from '@/modules/security/guards'

const createSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  playerAccount: z.string().trim().min(1),
  packageKey: z.string().trim().optional(),
  countValue: z.coerce.number().optional(),
  purchaseAmount: z.coerce.number().min(0),
  saleAmount: z.coerce.number().min(0),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  note: z.string().trim().max(500).optional(),
})

export async function GET() {
  try {
    await requireAdmin()
    const items = await getManualOrdersForAdmin()
    return ok(items)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = createSchema.parse(await request.json())

    const created = await createManualOrderByAdmin({
      adminId: admin.sub,
      userId: body.userId,
      productId: body.productId,
      playerAccount: body.playerAccount,
      packageKey: body.packageKey,
      countValue: body.countValue,
      purchaseAmount: body.purchaseAmount,
      saleAmount: body.saleAmount,
      status: body.status,
      note: body.note,
    })

    return ok(created, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}

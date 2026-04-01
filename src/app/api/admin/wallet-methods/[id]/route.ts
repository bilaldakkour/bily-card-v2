import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { deleteDepositMethod, updateDepositMethod } from '@/features/wallet/deposit-methods.service'

export async function PUT(request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = await updateDepositMethod(ctx.params.id, body)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin()
    const data = await deleteDepositMethod(ctx.params.id)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

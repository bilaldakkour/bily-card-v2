import { fail, ok } from '@/core/http'
import { requireAdmin } from '@/modules/security/guards'
import { createDepositMethod, listAdminDepositMethods } from '@/features/wallet/deposit-methods.service'

export async function GET() {
  try {
    await requireAdmin()
    const data = await listAdminDepositMethods()
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = await createDepositMethod(body)
    return ok(data, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}

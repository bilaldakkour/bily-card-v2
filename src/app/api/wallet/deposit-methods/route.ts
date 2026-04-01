import { fail, ok } from '@/core/http'
import { listPublicDepositMethods } from '@/features/wallet/deposit-methods.service'

export async function GET() {
  try {
    const data = await listPublicDepositMethods()
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

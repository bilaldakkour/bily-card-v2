import { fail, ok } from '@/core/http'
import { requireAuth } from '@/modules/security/guards'
import { createDepositRequest, getWalletSummary } from '@/features/wallet/service'

export async function GET() {
  try {
    const session = await requireAuth()
    const data = await getWalletSummary(session.sub)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const json = (await request.json()) as { amountMinor: number; receiptUrl?: string }

    const created = await createDepositRequest(session.sub, json.amountMinor, json.receiptUrl ?? '')
    return ok({ id: String(created._id) }, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}


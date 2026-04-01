import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requestPasswordReset } from '@/features/auth/password-reset.service'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = schema.parse(json)
    const result = await requestPasswordReset(input.email, request)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

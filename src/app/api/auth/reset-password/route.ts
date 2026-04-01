import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { resetPasswordWithToken } from '@/features/auth/password-reset.service'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = schema.parse(json)
    const result = await resetPasswordWithToken(input)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

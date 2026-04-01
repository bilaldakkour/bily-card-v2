import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { requestLoginChallenge } from '@/features/auth/login-challenge.service'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = schema.parse(json)
    const result = await requestLoginChallenge(input)
    return ok(result)
  } catch (error) {
    return fail(error)
  }
}

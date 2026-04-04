import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { createLoginChallengeForUser } from '@/features/auth/login-challenge.service'
import { registerCustomer } from '@/features/auth/service'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = schema.parse(json)

    const user = await registerCustomer(input)
    const challenge = await createLoginChallengeForUser({
      id: user.id,
      email: user.email,
    })

    return ok(challenge, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}

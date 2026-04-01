import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { registerCustomer } from '@/features/auth/service'
import { createSession, setSessionCookie } from '@/modules/security/session'

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
    const token = await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    await setSessionCookie(token)
    return ok(user, { status: 201 })
  } catch (error) {
    return fail(error)
  }
}


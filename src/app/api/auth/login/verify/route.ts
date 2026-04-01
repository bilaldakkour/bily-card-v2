import { z } from 'zod'
import { fail, ok } from '@/core/http'
import { verifyLoginChallenge } from '@/features/auth/login-challenge.service'
import { getUserSessionPayloadById } from '@/features/auth/service'
import { createSession, setSessionCookie } from '@/modules/security/session'

const schema = z.object({
  challengeId: z.string().min(1),
  code: z.string().min(6).max(6),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = schema.parse(json)

    const challenge = await verifyLoginChallenge(input)
    const user = await getUserSessionPayloadById(challenge.userId)
    const token = await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    await setSessionCookie(token)
    return ok(user)
  } catch (error) {
    return fail(error)
  }
}

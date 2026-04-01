import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { isProd, env } from '@/core/env'

const COOKIE_NAME = 'bily_session'
const secret = new TextEncoder().encode(env.AUTH_SECRET)

export type SessionPayload = {
  sub: string
  role: 'customer' | 'admin'
  email: string
}

export async function createSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  })
}

export async function getSession() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload as SessionPayload
  } catch {
    return null
  }
}


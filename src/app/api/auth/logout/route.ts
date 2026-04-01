import { fail, ok } from '@/core/http'
import { clearSessionCookie } from '@/modules/security/session'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await clearSessionCookie()
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: '/login',
      },
    })
  } catch (error) {
    return fail(error)
  }
}

export async function POST() {
  try {
    await clearSessionCookie()
    return ok({ success: true })
  } catch (error) {
    return fail(error)
  }
}

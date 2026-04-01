import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '')
const bucket = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const current = bucket.get(key)

  if (!current || now > current.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= max) return false
  current.count += 1
  return true
}

async function getRole(request: NextRequest) {
  const token = request.cookies.get('bily_session')?.value
  if (!token || !secret.length) return null

  try {
    const verified = await jwtVerify(token, secret)
    return (verified.payload.role as string) || null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/orders')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(`${ip}:${pathname}`, 30, 60_000)) {
      return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, { status: 429 })
    }
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = await getRole(request)
    if (role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin required' } }, { status: 403 })
      }

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/auth/:path*', '/api/orders/:path*'],
}


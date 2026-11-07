import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/auth',
  '/privacy',
  '/terms',
  '/changelog',
  '/canvas',
  '/api',
  '/mcp',
  '/.well-known',
  '/robots.txt',
  '/sitemap.xml',
  '/site.webmanifest',
]

const COOKIE_PREFIX = 'unishare'

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX })

  if (!hasSession && !isPublic(pathname)) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
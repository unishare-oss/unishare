import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

const PROTECTED_PATHS = ['/my-posts', '/profile', '/posts/new', '/admin']

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  if (!hasSession && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

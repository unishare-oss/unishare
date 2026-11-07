import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// /d: a shared deck opens only for a signed-in member of a university allowed to read it.
const PROTECTED_PATHS = ['/my-posts', '/profile', '/posts/new', '/admin', '/d']

/** Must match advanced.cookiePrefix in the API's auth config. */
const COOKIE_PREFIX = 'unishare'

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX })

  if (!hasSession && isProtected(pathname)) {
    const login = new URL('/login', request.url)
    // The login page checks uniauth silently and returns here.
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

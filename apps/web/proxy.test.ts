// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

function request(path: string, cookie?: string) {
  return new NextRequest(`https://share.psstee.me${path}`, {
    headers: cookie ? { cookie } : {},
  })
}

describe('proxy', () => {
  it('treats the unishare session cookie as signed in', () => {
    const res = proxy(request('/login', '__Secure-unishare.session_token=tok'))
    expect(res.headers.get('location')).toBe('https://share.psstee.me/feed')
  })

  it('ignores the old domain-wide better-auth cookie', () => {
    const res = proxy(request('/profile', '__Secure-better-auth.session_token=old'))
    expect(res.headers.get('location')).toBe('https://share.psstee.me/login?next=%2Fprofile')
    expect(res.headers.getSetCookie()).toEqual([])
  })

  it('sends signed-out visitors of protected pages to login with a way back', () => {
    const res = proxy(request('/profile?tab=saved'))
    expect(res.headers.get('location')).toBe(
      'https://share.psstee.me/login?next=%2Fprofile%3Ftab%3Dsaved',
    )
  })

  it('sends a signed-out visitor of a share link to login first', () => {
    const res = proxy(request('/d/tok123'))
    expect(res.headers.get('location')).toBe('https://share.psstee.me/login?next=%2Fd%2Ftok123')
  })

  it('sends a signed-out visitor of any app page to login with a way back', () => {
    for (const path of ['/feed', '/posts/p1', '/s/abc', '/departments', '/users/u1']) {
      const res = proxy(request(path))
      expect(res.headers.get('location')).toBe(
        `https://share.psstee.me/login?next=${encodeURIComponent(path)}`,
      )
    }
  })

  it('leaves the landing, sign-in, legal pages, canvas boards and API rewrites public', () => {
    for (const path of [
      '/',
      '/login',
      '/auth/return',
      '/privacy',
      '/terms',
      '/canvas/room1',
      '/api/auth/get-session',
      '/.well-known/openid-configuration',
      '/robots.txt',
    ]) {
      expect(proxy(request(path)).headers.get('location')).toBeNull()
    }
  })

  it('does not treat a lookalike of a public path as public', () => {
    expect(proxy(request('/login-help')).headers.get('location')).toBe(
      'https://share.psstee.me/login?next=%2Flogin-help',
    )
  })

  it('lets a guest (any session cookie) into app pages', () => {
    const res = proxy(request('/feed', '__Secure-unishare.session_token=tok'))
    expect(res.headers.get('location')).toBeNull()
  })
})

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
})

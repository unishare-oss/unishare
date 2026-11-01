import { describe, expect, it, vi } from 'vitest'

const social = vi.hoisted(() => vi.fn())

vi.mock('./client', () => ({ authClient: { signIn: { social } } }))

const { safeReturnPath, signInWithUniauth } = await import('./uniauth')

describe('safeReturnPath', () => {
  it('keeps a path on this app', () => {
    expect(safeReturnPath('/profile')).toBe('/profile')
    expect(safeReturnPath('/posts/1?tab=comments')).toBe('/posts/1?tab=comments')
  })

  it.each([
    '//evil.example',
    '/\\evil.example',
    '/\n/evil.example',
    '/\t/evil.example',
    'https://evil.example',
    'profile',
    '',
    null,
  ])('falls back to /feed for %j', (value) => {
    expect(safeReturnPath(value)).toBe('/feed')
  })
})

describe('signInWithUniauth', () => {
  it('rejects when the sign-in request answers with an error', async () => {
    social.mockResolvedValueOnce({ data: null, error: { message: 'Provider not found' } })
    await expect(signInWithUniauth({ returnTo: '/feed' })).rejects.toThrow('Provider not found')
  })

  it('resolves when the sign-in starts', async () => {
    social.mockResolvedValueOnce({ data: { url: 'https://uniauth.example' }, error: null })
    await expect(signInWithUniauth({ returnTo: '/feed' })).resolves.toBeUndefined()
  })
})

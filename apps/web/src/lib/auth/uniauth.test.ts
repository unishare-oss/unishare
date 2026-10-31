import { describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({ authClient: {} }))

const { safeReturnPath } = await import('./uniauth')

describe('safeReturnPath', () => {
  it('keeps a path on this app', () => {
    expect(safeReturnPath('/profile')).toBe('/profile')
    expect(safeReturnPath('/posts/1?tab=comments')).toBe('/posts/1?tab=comments')
  })

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'profile', '', null])(
    'falls back to /feed for %j',
    (value) => {
      expect(safeReturnPath(value)).toBe('/feed')
    },
  )
})

import { describe, expect, it } from 'vitest'
import { buildVisibleNavigation, isRouteActive } from './navigation-config'

describe('isRouteActive', () => {
  it.each([
    ['/feed', '/feed', true],
    ['/feed/latest', '/feed', true],
    ['/feedback', '/feed', false],
    ['/chatty', '/chat', false],
    ['/chat/room-1', '/chat', true],
    ['/saved', '/feed', false],
  ])('matches %s against %s as %s', (pathname, href, expected) => {
    expect(isRouteActive(pathname, href)).toBe(expected)
  })
})

describe('buildVisibleNavigation', () => {
  it('returns only public destinations for guests', () => {
    expect(
      buildVisibleNavigation(false).flatMap((group) => group.items.map((item) => item.href)),
    ).toEqual(['/feed', '/saved', '/departments'])
  })

  it('groups student destinations without admin links', () => {
    const groups = buildVisibleNavigation(true, 'STUDENT')
    expect(groups.map((group) => group.id)).toEqual(['primary', 'workspace', 'discover'])
    expect(groups.flatMap((group) => group.items)).not.toContainEqual(
      expect.objectContaining({ href: '/admin/moderation' }),
    )
  })

  it('keeps admin-only user management away from moderators', () => {
    const moderator = buildVisibleNavigation(true, 'MODERATOR').flatMap((group) => group.items)
    const admin = buildVisibleNavigation(true, 'ADMIN').flatMap((group) => group.items)
    expect(moderator.map((item) => item.href)).not.toContain('/admin/users')
    expect(admin.map((item) => item.href)).toContain('/admin/users')
  })
})

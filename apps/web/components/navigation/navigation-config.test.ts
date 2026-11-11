import { describe, expect, it } from 'vitest'
import {
  buildModerationNavigation,
  isNavItemActive,
  coursesHref,
  isRouteActive,
  mainNavigation,
  mobileTabNavigation,
  phoneOnlyStuffNavigation,
  sidebarNavigation,
  yourStuffNavigation,
} from './navigation-config'

const hrefs = (items: { href: string }[]) => items.map((item) => item.href)
const labels = (items: { label: string }[]) => items.map((item) => item.label)

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

describe('isNavItemActive', () => {
  const [today] = mainNavigation('d1')
  it('highlights Today on /feed and below', () => {
    expect(isNavItemActive('/feed', today)).toBe(true)
    expect(isNavItemActive('/feed/latest', today)).toBe(true)
    expect(isNavItemActive('/profile', today)).toBe(false)
  })
})

describe('main navigation', () => {
  it('shows Today, Courses and Profile in that order', () => {
    expect(labels(mainNavigation('d1'))).toEqual(['Today', 'Courses', 'Profile'])
    expect(hrefs(mainNavigation('d1'))).toEqual(['/feed', '/departments/d1', '/profile'])
  })

  it('sends Courses to the department list when the user has no department', () => {
    expect(coursesHref(null)).toBe('/departments')
    expect(hrefs(mainNavigation(undefined))[1]).toBe('/departments')
  })

  it('highlights Courses on any departments page, not only the own department', () => {
    const courses = mainNavigation('d1')[1]
    expect(isNavItemActive('/departments/d9', courses)).toBe(true)
    expect(isNavItemActive('/departments', courses)).toBe(true)
    expect(isNavItemActive('/feed', courses)).toBe(false)
  })

  it('gives the phone bar three tabs, with Profile labelled Me', () => {
    expect(labels(mobileTabNavigation('d1'))).toEqual(['Today', 'Courses', 'Me'])
    expect(hrefs(mobileTabNavigation('d1'))[2]).toBe('/profile')
  })
})

describe('sidebar and profile items', () => {
  it('keeps every old entry a student still needs, and drops quizzes', () => {
    const all = [...sidebarNavigation, ...yourStuffNavigation, ...phoneOnlyStuffNavigation].map(
      (item) => item.href,
    )
    expect(all).toEqual(
      expect.arrayContaining(['/chat', '/notifications', '/calendar', '/boards', '/saved']),
    )
    expect(all).toEqual(expect.arrayContaining(['/my-posts', '/requests', '/decks', '/analytics']))
    expect(all).not.toContain('/quizzes')
  })
})

describe('buildModerationNavigation', () => {
  it('is empty for students and guests', () => {
    expect(buildModerationNavigation('STUDENT')).toEqual([])
    expect(buildModerationNavigation(null)).toEqual([])
  })

  it('keeps admin-only user management away from moderators', () => {
    const moderator = hrefs(buildModerationNavigation('MODERATOR'))
    const admin = hrefs(buildModerationNavigation('ADMIN'))
    expect(moderator).toContain('/admin/moderation')
    expect(moderator).not.toContain('/admin/users')
    expect(moderator).not.toContain('/admin/audit')
    expect(admin).toEqual(expect.arrayContaining(['/admin/users', '/admin/audit']))
  })
})

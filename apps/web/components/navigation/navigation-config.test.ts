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
  const [today, , campus] = mainNavigation('d1')
  it('highlights Campus only on the campus tab, and Today otherwise', () => {
    expect(isNavItemActive('/feed', 'campus', campus)).toBe(true)
    expect(isNavItemActive('/feed', 'campus', today)).toBe(false)
    expect(isNavItemActive('/feed', null, today)).toBe(true)
    expect(isNavItemActive('/feed', null, campus)).toBe(false)
  })
})

describe('main navigation', () => {
  it('shows Today, Courses, Campus and Profile in that order', () => {
    expect(labels(mainNavigation('d1'))).toEqual(['Today', 'Courses', 'Campus', 'Profile'])
    expect(hrefs(mainNavigation('d1'))).toEqual([
      '/feed',
      '/departments/d1',
      '/feed?tab=campus',
      '/profile',
    ])
  })

  it('sends Courses to the department list when the user has no department', () => {
    expect(coursesHref(null)).toBe('/departments')
    expect(hrefs(mainNavigation(undefined))[1]).toBe('/departments')
  })

  it('highlights Courses on any departments page, not only the own department', () => {
    const courses = mainNavigation('d1')[1]
    expect(isNavItemActive('/departments/d9', null, courses)).toBe(true)
    expect(isNavItemActive('/departments', null, courses)).toBe(true)
    expect(isNavItemActive('/feed', null, courses)).toBe(false)
  })

  it('is not active for Today or Campus while the tab is unknown', () => {
    const [today, , campus] = mainNavigation('d1')
    expect(isNavItemActive('/feed', undefined, today)).toBe(false)
    expect(isNavItemActive('/feed', undefined, campus)).toBe(false)
    expect(isNavItemActive('/profile', undefined, mainNavigation('d1')[3])).toBe(true)
  })

  it('gives the phone bar four tabs, with Profile labelled Me', () => {
    expect(labels(mobileTabNavigation('d1'))).toEqual(['Today', 'Courses', 'Campus', 'Me'])
    expect(hrefs(mobileTabNavigation('d1'))[3]).toBe('/profile')
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

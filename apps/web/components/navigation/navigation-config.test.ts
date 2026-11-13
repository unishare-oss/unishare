import { describe, expect, it } from 'vitest'
import {
  buildVisibleNavigation,
  coursesHref,
  isNavItemActive,
  guestPhoneTabs,
  isRouteActive,
  moderationItems,
  yourStuffNavigation,
} from './navigation-config'

const labels = (groupId: string, role = 'STUDENT', departmentId?: string) =>
  buildVisibleNavigation(true, role, departmentId)
    .find((group) => group.id === groupId)
    ?.items.map((item) => item.label)

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
  const courses = buildVisibleNavigation(true, 'STUDENT', 'd-1')[0].items[1]

  it.each([
    ['/departments', true],
    ['/departments/d-1', true],
    ['/courses/c-1', true],
    ['/coursesx', false],
    ['/feed', false],
  ])('marks Courses active on %s as %s', (pathname, expected) => {
    expect(isNavItemActive(pathname, courses)).toBe(expected)
  })
})

describe('coursesHref', () => {
  it('links to the department page, or the department list without one', () => {
    expect(coursesHref('d-1')).toBe('/departments/d-1')
    expect(coursesHref()).toBe('/departments')
    expect(coursesHref(null)).toBe('/departments')
  })
})

describe('buildVisibleNavigation', () => {
  it('returns only public destinations for guests', () => {
    const items = buildVisibleNavigation(false).flatMap((group) => group.items)
    expect(items.map((item) => item.href)).toEqual([
      '/feed',
      '/saved',
      '/departments',
      '/boards',
      '/profile',
    ])
    expect(items.map((item) => item.label)).toEqual([
      'Today',
      'Saved',
      'Courses',
      'Boards',
      'Profile',
    ])
  })

  it('gives members Today, Courses, Profile, Chat, Notifications, Calendar, Boards and Saved', () => {
    const groups = buildVisibleNavigation(true, 'STUDENT', 'd-1')
    expect(groups.map((group) => group.id)).toEqual(['main', 'more'])
    expect(labels('main', 'STUDENT', 'd-1')).toEqual(['Today', 'Courses', 'Profile'])
    expect(labels('more')).toEqual(['Chat', 'Notifications', 'Calendar', 'Boards', 'Saved'])
    const courseHref = (departmentId?: string) =>
      buildVisibleNavigation(true, 'STUDENT', departmentId)[0].items[1].href
    expect(courseHref('d-1')).toBe('/departments/d-1')
    expect(courseHref()).toBe('/departments')
  })

  it('moves Quizzes to Your stuff', () => {
    expect(yourStuffNavigation.map((item) => item.label)).toEqual([
      'My Posts',
      'Requests',
      'Decks',
      'Analytics',
      'Quizzes',
    ])
    const hrefs = buildVisibleNavigation(true, 'ADMIN').flatMap((group) =>
      group.items.map((item) => item.href),
    )
    expect(hrefs).not.toContain('/quizzes')
  })

  it('adds Moderation for admins and moderators only', () => {
    expect(labels('moderation', 'STUDENT')).toBeUndefined()
    const moderator = labels('moderation', 'MODERATOR')
    const admin = labels('moderation', 'ADMIN')
    expect(moderator).toContain('Moderation')
    expect(moderator).not.toContain('Users')
    expect(moderator).not.toContain('Audit Log')
    expect(admin).toContain('Users')
    expect(admin).toContain('Audit Log')
    expect(moderationItems('STUDENT')).toEqual([])
    expect(moderationItems('ADMIN').map((item) => item.label)).toEqual(admin)
  })

  it('gives guests four phone tabs without Courses', () => {
    expect(guestPhoneTabs.map((item) => item.label)).toEqual([
      'Today',
      'Saved',
      'Boards',
      'Profile',
    ])
  })
})

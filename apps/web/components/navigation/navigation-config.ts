import type { ElementType } from 'react'
import {
  BarChart2,
  Bell,
  Bookmark,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  FileText,
  Flag,
  Home,
  LayoutGrid,
  MessageSquare,
  MessageSquareHeart,
  MessageSquarePlus,
  Palette,
  Presentation,
  Puzzle,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'

export type NavigationGroupId = 'main' | 'more' | 'moderation'

export interface NavigationItem {
  href: string
  label: string
  shortLabel?: string
  icon: ElementType
  /** Also active on these paths and everything below them. */
  matchPrefixes?: string[]
}

export interface NavigationGroup {
  id: NavigationGroupId
  label: string
  items: NavigationItem[]
}

const today: NavigationItem = { href: '/feed', label: 'Today', icon: Home }
const saved: NavigationItem = { href: '/saved', label: 'Saved', icon: Bookmark }
const boards: NavigationItem = { href: '/boards', label: 'Boards', icon: LayoutGrid }
const calendar: NavigationItem = { href: '/calendar', label: 'Calendar', icon: CalendarDays }
const profile: NavigationItem = {
  href: '/profile',
  label: 'Profile',
  shortLabel: 'Me',
  icon: UserRound,
}

/** Courses goes to the member's department course list, or the department list without one. */
export function coursesHref(departmentId?: string | null): string {
  return departmentId ? `/departments/${departmentId}` : '/departments'
}

function coursesItem(departmentId?: string | null): NavigationItem {
  return {
    href: coursesHref(departmentId),
    label: 'Courses',
    icon: BookOpen,
    matchPrefixes: ['/departments', '/courses'],
  }
}

/** Profile's "Your stuff". Quizzes lives only here. */
export const yourStuffNavigation: NavigationItem[] = [
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
  { href: '/decks', label: 'Decks', icon: Presentation },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/quizzes', label: 'Quizzes', icon: Puzzle },
]

/** In the sidebar on desktop, so Profile lists them on phones. */
export const phoneOnlyNavigation: NavigationItem[] = [
  calendar,
  boards,
  saved,
  { href: '/appearance', label: 'Appearance', icon: Palette },
]

const adminItems: NavigationItem[] = [
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
  {
    href: '/admin/departments',
    label: 'Manage Departments',
    shortLabel: 'Departments',
    icon: Building2,
  },
  { href: '/admin/quizzes', label: 'Generate Quiz', shortLabel: 'Quiz', icon: BrainCircuit },
]

/** A guest's phone tabs: the sidebar's public items without Courses. */
export const guestPhoneTabs: NavigationItem[] = [today, saved, boards, profile]

const adminOnlyItems: NavigationItem[] = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit Log', shortLabel: 'Audit', icon: ScrollText },
]

/** The Moderation group's items for a role, or none for anyone else. */
export function moderationItems(role?: string | null): NavigationItem[] {
  if (role === 'ADMIN') return [...adminItems, ...adminOnlyItems]
  if (role === 'MODERATOR') return [...adminItems]
  return []
}

export function buildVisibleNavigation(
  authenticated: boolean,
  role?: string | null,
  departmentId?: string | null,
): NavigationGroup[] {
  if (!authenticated) {
    return [
      {
        id: 'main',
        label: 'Main',
        items: [today, saved, coursesItem(), boards, profile],
      },
    ]
  }

  const groups: NavigationGroup[] = [
    { id: 'main', label: 'Main', items: [today, coursesItem(departmentId), profile] },
    {
      id: 'more',
      label: 'More',
      items: [
        { href: '/chat', label: 'Chat', icon: MessageSquare },
        { href: '/notifications', label: 'Notifications', icon: Bell },
        calendar,
        boards,
        saved,
      ],
    },
  ]
  const moderation = moderationItems(role)
  if (moderation.length > 0) {
    groups.push({ id: 'moderation', label: 'Moderation', items: moderation })
  }
  return groups
}

export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isNavItemActive(pathname: string, item: NavigationItem): boolean {
  return (
    isRouteActive(pathname, item.href) ||
    !!item.matchPrefixes?.some((prefix) => isRouteActive(pathname, prefix))
  )
}

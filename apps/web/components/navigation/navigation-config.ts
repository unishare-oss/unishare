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
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'

export interface NavigationItem {
  href: string
  label: string
  shortLabel?: string
  icon: ElementType
  /** Active on this path and everything below it. Defaults to href. */
  matchPrefix?: string
}

const todayItem: NavigationItem = { href: '/feed', label: 'Today', icon: Home }
const profileItem: NavigationItem = { href: '/profile', label: 'Profile', icon: UserRound }

/** Courses goes to the student's department course list until US-56 adds course pages. */
export function coursesHref(departmentId?: string | null): string {
  return departmentId ? `/departments/${departmentId}` : '/departments'
}

/** Desktop sidebar: Today, Courses, Profile. Guests see the same three. */
export function mainNavigation(departmentId?: string | null): NavigationItem[] {
  return [
    todayItem,
    {
      href: coursesHref(departmentId),
      label: 'Courses',
      icon: BookOpen,
      matchPrefix: '/departments',
    },
    profileItem,
  ]
}

/** Phone bottom tab bar: the same three destinations, with Profile labelled Me. */
export function mobileTabNavigation(departmentId?: string | null): NavigationItem[] {
  return mainNavigation(departmentId).map((item) =>
    item.href === profileItem.href ? { ...item, label: 'Me' } : item,
  )
}

/** Signed-in items below the main four in the desktop sidebar. */
export const sidebarNavigation: NavigationItem[] = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/saved', label: 'Saved', icon: Bookmark },
]

/** Profile → "Your stuff", shown on every screen size. */
export const yourStuffNavigation: NavigationItem[] = [
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
  { href: '/decks', label: 'Decks', icon: Presentation },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

/** Phone only: these sit in the sidebar on desktop, so Profile lists them on phones. */
export const phoneOnlyStuffNavigation: NavigationItem[] = [
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/appearance', label: 'Appearance', icon: Palette },
]

/** Moderation group for moderators and admins. Admins also get user management and the audit log. */
export function buildModerationNavigation(role?: string | null): NavigationItem[] {
  if (role !== 'ADMIN' && role !== 'MODERATOR') return []
  const items: NavigationItem[] = [
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
  if (role === 'ADMIN') {
    items.push(
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/audit', label: 'Audit Log', shortLabel: 'Audit', icon: ScrollText },
    )
  }
  return items
}

export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isNavItemActive(pathname: string, item: NavigationItem) {
  return isRouteActive(pathname, item.matchPrefix ?? item.href)
}

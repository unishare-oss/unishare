import type { ElementType } from 'react'
import {
  BarChart2,
  Bookmark,
  BrainCircuit,
  Building2,
  CalendarDays,
  FileText,
  Flag,
  LayoutGrid,
  LayoutList,
  MessageSquare,
  MessageSquareHeart,
  MessageSquarePlus,
  Presentation,
  Puzzle,
  ShieldCheck,
  Users,
} from 'lucide-react'

export type NavigationGroupId = 'primary' | 'workspace' | 'discover' | 'admin'

export interface NavigationItem {
  href: string
  label: string
  shortLabel?: string
  icon: ElementType
}

export interface NavigationGroup {
  id: NavigationGroupId
  label: string
  items: NavigationItem[]
}

export const guestNavigation: NavigationItem[] = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const authenticatedGroups: NavigationGroup[] = [
  {
    id: 'primary',
    label: 'Primary',
    items: [
      { href: '/feed', label: 'Feed', icon: LayoutList },
      { href: '/chat', label: 'Chat', icon: MessageSquare },
      { href: '/boards', label: 'Boards', icon: LayoutGrid },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { href: '/my-posts', label: 'My Posts', icon: FileText },
      { href: '/saved', label: 'Saved', icon: Bookmark },
      { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    items: [
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/departments', label: 'Departments', icon: Building2 },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/quizzes', label: 'Quizzes', icon: Puzzle },
      { href: '/decks', label: 'Decks', icon: Presentation },
    ],
  },
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

export function buildVisibleNavigation(
  authenticated: boolean,
  role?: string | null,
): NavigationGroup[] {
  if (!authenticated) {
    return [{ id: 'primary', label: 'Explore', items: guestNavigation }]
  }

  const groups = authenticatedGroups.map((group) => ({ ...group, items: [...group.items] }))
  if (role === 'ADMIN' || role === 'MODERATOR') {
    groups.push({
      id: 'admin',
      label: 'Admin',
      items:
        role === 'ADMIN'
          ? [...adminItems, { href: '/admin/users', label: 'Users', icon: Users }]
          : [...adminItems],
    })
  }
  return groups
}

export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRail } from '@/components/app-rail'
import { useUIStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({
  pathname: '/feed',
  authenticated: true,
  role: 'STUDENT',
  unreadChat: 4,
  notificationCount: 2,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: mocks.authenticated,
    session: mocks.authenticated
      ? { user: { name: 'Ada', role: mocks.role, universityId: 'u1' } }
      : null,
  }),
}))
vi.mock('@/hooks/use-unread-chat-count', () => ({ useUnreadChatCount: () => mocks.unreadChat }))
vi.mock('@/src/lib/api/generated/notifications/notifications', () => ({
  useNotificationsControllerFindAll: () => ({
    data: Array.from({ length: mocks.notificationCount }, (_, index) => ({
      id: index,
      read: false,
      type: 'SYSTEM',
    })),
  }),
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindOne: () => ({ data: { shortName: 'UNI' } }),
}))
vi.mock('@/src/lib/auth/client', () => ({ authClient: { signOut: vi.fn() } }))
vi.mock('@/components/feedback/feedback-dialog', () => ({ FeedbackDialog: () => null }))

describe('responsive navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/feed'
    mocks.authenticated = true
    mocks.role = 'STUDENT'
    mocks.unreadChat = 4
    mocks.notificationCount = 2
    useUIStore.setState({ sidebarCollapsed: false })
  })

  it('renders the expanded desktop hierarchy and persists collapse state', async () => {
    render(<AppRail />)
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create post' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
  })

  it('caps desktop unread badges and hides protected controls for guests', () => {
    mocks.unreadChat = 120
    const { unmount } = render(<AppRail />)
    expect(screen.getByText('99+')).toBeInTheDocument()
    unmount()
    mocks.authenticated = false
    render(<AppRail />)
    expect(screen.queryByRole('link', { name: 'Create post' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('condenses admin links into a flyout while collapsed', async () => {
    mocks.role = 'ADMIN'
    useUIStore.setState({ sidebarCollapsed: true })
    render(<AppRail />)

    expect(screen.getByRole('button', { name: 'Admin menu' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Admin menu' }))
    expect(screen.getByRole('menuitem', { name: 'Moderation' })).toHaveAttribute(
      'href',
      '/admin/moderation',
    )
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveAttribute('href', '/admin/users')
  })
})

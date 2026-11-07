import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRail } from '@/components/app-rail'
import { MobileNav } from '@/components/mobile-nav'
import { useUIStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({
  pathname: '/feed',
  authenticated: true,
  guest: false,
  signInWithUniauth: vi.fn(() => Promise.resolve()),
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
    isGuest: mocks.guest,
    session:
      mocks.authenticated || mocks.guest
        ? { user: { name: 'Ada', role: mocks.role, universityId: 'u1', isAnonymous: mocks.guest } }
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
vi.mock('@/src/lib/auth/uniauth', () => ({
  signInWithUniauth: mocks.signInWithUniauth,
  signOutOfUniauth: vi.fn(),
}))
vi.mock('@/components/feedback/feedback-dialog', () => ({ FeedbackDialog: () => null }))

describe('responsive navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/feed'
    mocks.authenticated = true
    mocks.guest = false
    mocks.signInWithUniauth.mockClear()
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
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  describe('a guest (anonymous session)', () => {
    beforeEach(() => {
      mocks.authenticated = false
      mocks.guest = true
    })

    it('gets the guest navigation on desktop, not the account menu', () => {
      render(<AppRail />)
      expect(screen.getByText('Explore')).toBeInTheDocument()
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Leave guest mode' })).toBeInTheDocument()
      // Guests keep canvas boards and their bio.
      expect(screen.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/boards')
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    })

    it('signs in on uniauth straight from the desktop rail, not via /login', async () => {
      render(<AppRail />)
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
      expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
    })

    it('gets the guest dock on mobile, with no create button, and signs in on uniauth', async () => {
      render(<MobileNav />)
      expect(screen.getByRole('link', { name: 'Feed' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Create post' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Chat' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/boards')
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
      expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
    })
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

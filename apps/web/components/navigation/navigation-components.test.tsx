import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    user: mocks.authenticated
      ? { department: { id: 'd-1', name: 'Computer Science' }, yearLevel: 2 }
      : null,
    session:
      mocks.authenticated || mocks.guest
        ? { user: { name: 'Ada', role: mocks.role, universityId: 'u1', isAnonymous: mocks.guest } }
        : null,
  }),
}))
vi.mock('@/hooks/use-unread-chat-count', () => ({ useUnreadChatCount: () => mocks.unreadChat }))
vi.mock('@/src/lib/api/generated/notifications/notifications', () => ({
  useNotificationsControllerFindAll: () => ({
    data: [
      ...Array.from({ length: mocks.notificationCount }, (_, index) => ({
        id: index,
        read: false,
        type: 'SYSTEM',
      })),
      { id: 'chat', read: false, type: 'CHAT_MESSAGE' },
    ],
  }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({
    data: {
      items: [
        { id: 'c-1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
        { id: 'c-2', code: 'CSC401', name: 'Compilers', yearLevel: 4 },
      ],
    },
  }),
}))
vi.mock('@unishare-oss/unitheme/react', () => ({
  useTheme: () => ({ theme: 'theme-unishare', setTheme: vi.fn() }),
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

  it('renders the member sidebar links', () => {
    render(<AppRail />)
    const nav = [
      within(screen.getByRole('navigation', { name: 'Main' })),
      within(screen.getByRole('navigation', { name: 'More' })),
    ]
    const names = nav.flatMap((scope) => scope.getAllByRole('link').map((link) => link.textContent))
    expect(names.map((name) => name?.replace(/\d+$/, ''))).toEqual([
      'Today',
      'Courses',
      'Profile',
      'Chat',
      'Notifications',
      'Calendar',
      'Boards',
      'Saved',
    ])
    expect(screen.getByRole('link', { name: 'Courses' })).toHaveAttribute(
      'href',
      '/departments/d-1',
    )
    expect(screen.getByRole('link', { name: 'Share a note' })).toHaveAttribute('href', '/posts/new')
  })

  it('shows the Noto logo, not the app icon, in the sidebar and the phone top bar', () => {
    const rail = render(<AppRail />)
    expect(rail.container.querySelector('svg[data-slot="noto-logo"]')).toBeInTheDocument()
    expect(rail.container.querySelector('img[src*="icon.svg"]')).not.toBeInTheDocument()
    rail.unmount()
    const phone = render(<MobileNav />)
    expect(phone.container.querySelector('svg[data-slot="noto-logo"]')).toBeInTheDocument()
    expect(phone.container.querySelector('img[src*="icon.svg"]')).not.toBeInTheDocument()
  })

  it('marks the active Chat link on the phone top bar', () => {
    mocks.pathname = '/chat'
    render(<MobileNav />)
    expect(screen.getByRole('link', { name: /^Chat/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /^Notifications/ })).not.toHaveAttribute('aria-current')
  })

  it('shows unread chat and notification counts', () => {
    const { unmount } = render(<AppRail />)
    expect(screen.getByRole('link', { name: 'Chat (4)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifications (2)' })).toBeInTheDocument()
    unmount()
    mocks.unreadChat = 3
    const phone = render(<MobileNav />)
    expect(screen.getByRole('link', { name: 'Chat (3)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifications (2)' })).toBeInTheDocument()
    phone.unmount()
    mocks.unreadChat = 120
    render(<AppRail />)
    expect(screen.getByRole('link', { name: 'Chat (99+)' })).toBeInTheDocument()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('does not list My courses; that card lives in the Today rail', () => {
    render(<AppRail />)
    expect(screen.queryByText('My courses')).not.toBeInTheDocument()
    expect(screen.queryByText('CSC213')).not.toBeInTheDocument()
  })

  it('persists collapse state and shows icons only', async () => {
    render(<AppRail />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
  })

  it('shows the phone top bar and tab bar', () => {
    render(<MobileNav />)
    expect(screen.getByRole('link', { name: /^Chat/ })).toHaveAttribute('href', '/chat')
    expect(screen.getByRole('link', { name: /^Notifications/ })).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(screen.getByRole('link', { name: 'Share a note' })).toHaveAttribute('href', '/posts/new')
    const tabs = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(tabs.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Today',
      'Courses',
      'Me',
    ])
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('condenses moderation links into a flyout while collapsed', async () => {
    mocks.role = 'ADMIN'
    useUIStore.setState({ sidebarCollapsed: true })
    render(<AppRail />)

    expect(screen.getByRole('button', { name: 'Moderation menu' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Moderation menu' }))
    expect(screen.getByRole('menuitem', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/admin/reports',
    )
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveAttribute('href', '/admin/users')
  })

  describe('a guest (anonymous session) or signed-out visitor', () => {
    beforeEach(() => {
      mocks.authenticated = false
      mocks.guest = true
    })

    it('gets the guest items on desktop and phone, with no Share or Your stuff', async () => {
      const desktop = render(<AppRail />)
      const nav = within(screen.getByRole('navigation', { name: 'Main' }))
      expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
        'Today',
        'Saved',
        'Courses',
        'Boards',
        'Profile',
      ])
      expect(screen.queryByRole('link', { name: 'Share a note' })).not.toBeInTheDocument()
      expect(screen.queryByText('My courses')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Leave guest mode' })).toBeInTheDocument()
      desktop.unmount()

      render(<MobileNav />)
      const tabs = within(screen.getByRole('navigation', { name: 'Main' }))
      const links = tabs.getAllByRole('link')
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/feed',
        '/saved',
        '/boards',
        '/profile',
      ])
      expect(screen.queryByRole('link', { name: 'Share a note' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /^Chat/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Leave guest mode' })).toBeInTheDocument()
    })

    it('signs in on uniauth straight from the desktop sidebar, not via /login', async () => {
      render(<AppRail />)
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
    })

    it('signs in on uniauth from the phone top bar', async () => {
      render(<MobileNav />)
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
    })
  })
})

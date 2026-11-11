import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { useFeedStore, useUIStore } from '@/lib/store'

const pageOne = {
  items: [
    { id: 'c1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
    { id: 'c2', code: 'CSC101', name: 'Intro', yearLevel: 1 },
  ],
  totalPages: 2,
}
const pageTwo = {
  items: [{ id: 'c3', code: 'CSC300', name: 'Compilers', yearLevel: 2 }],
  totalPages: 2,
}

const mocks = vi.hoisted(() => ({
  pathname: '/feed',
  authenticated: true,
  guest: false,
  role: 'STUDENT',
  departmentId: 'd1' as string | null,
  yearLevel: 2 as number | null,
  pages: [] as unknown[],
  coursesFindAll: vi.fn(),
  desktop: true,
  lastEnabled: undefined as boolean | undefined,
  signInWithUniauth: vi.fn(() => Promise.resolve()),
  unreadChat: 4,
  notificationCount: 2,
  setTheme: vi.fn(),
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
    user: {
      department: mocks.departmentId ? { id: mocks.departmentId } : null,
      yearLevel: mocks.yearLevel,
    },
    session:
      mocks.authenticated || mocks.guest
        ? { user: { name: 'Ada', role: mocks.role, universityId: 'u1', isAnonymous: mocks.guest } }
        : null,
  }),
}))
vi.mock('@unishare-oss/unitheme/react', () => ({
  useTheme: () => ({ theme: 'theme-unishare', setTheme: mocks.setTheme }),
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
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAllInfinite: (
    params: unknown,
    options: { query?: { enabled?: boolean } },
  ) => {
    mocks.coursesFindAll(params)
    mocks.lastEnabled = options.query?.enabled
    if (options.query?.enabled === false) return { data: undefined, hasNextPage: false }
    return {
      data: { pages: mocks.pages.map((page) => ({ data: page })) },
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    }
  },
}))
vi.mock('@/src/lib/auth/client', () => ({ authClient: { signOut: vi.fn() } }))
vi.mock('@/src/lib/auth/uniauth', () => ({
  signInWithUniauth: mocks.signInWithUniauth,
  signOutOfUniauth: vi.fn(),
}))
vi.mock('@/components/feedback/feedback-dialog', () => ({ FeedbackDialog: () => null }))

function renderSidebar(tab: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AppSidebar tab={tab} />
    </QueryClientProvider>,
  )
}

const primaryNav = () => screen.getByRole('navigation', { name: 'Primary' })

describe('desktop sidebar', () => {
  beforeEach(() => {
    mocks.pathname = '/feed'
    mocks.authenticated = true
    mocks.guest = false
    mocks.role = 'STUDENT'
    mocks.departmentId = 'd1'
    mocks.yearLevel = 2
    mocks.unreadChat = 4
    mocks.notificationCount = 2
    mocks.pages = [pageOne, pageTwo]
    mocks.coursesFindAll.mockReset()
    mocks.desktop = true
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: mocks.desktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    mocks.setTheme.mockClear()
    mocks.signInWithUniauth.mockClear()
    useUIStore.setState({ sidebarCollapsed: false })
  })

  it('shows Today, Courses, Campus and Profile, then the signed-in items', () => {
    renderSidebar()
    const nav = within(primaryNav())
    expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/feed')
    expect(nav.getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/departments/d1')
    expect(nav.getByRole('link', { name: 'Campus' })).toHaveAttribute('href', '/feed?tab=campus')
    expect(nav.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(nav.getByRole('link', { name: 'Chat (4)' })).toHaveAttribute('href', '/chat')
    expect(nav.getByRole('link', { name: 'Notifications (2)' })).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(nav.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar')
    expect(nav.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/boards')
    expect(nav.getByRole('link', { name: 'Saved' })).toHaveAttribute('href', '/saved')
    expect(nav.queryByRole('link', { name: /Quiz/ })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Assistant' })).not.toBeInTheDocument()
  })

  it('links Share a note to /posts/new', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Share a note' })).toHaveAttribute('href', '/posts/new')
  })

  it('lists the courses for the student year from every page, code and name', async () => {
    renderSidebar()
    const section = await screen.findByRole('region', { name: 'My courses' })
    expect(within(section).getByText('CSC213')).toBeInTheDocument()
    expect(within(section).getByText('Data Structures')).toBeInTheDocument()
    expect(within(section).getByText('CSC300')).toBeInTheDocument()
    expect(within(section).queryByText('CSC101')).not.toBeInTheDocument()
    expect(mocks.coursesFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: 'd1', limit: 100 }),
    )
  })

  it('does not load My courses on phones, where the sidebar is not shown', () => {
    mocks.desktop = false
    renderSidebar()
    expect(screen.queryByRole('region', { name: 'My courses' })).not.toBeInTheDocument()
    expect(mocks.lastEnabled).toBe(false)
  })

  it('links each course to its course page', async () => {
    renderSidebar()
    const section = await screen.findByRole('region', { name: 'My courses' })
    expect(within(section).getByRole('link', { name: /CSC213/ })).toHaveAttribute(
      'href',
      '/courses/c1',
    )
  })

  it('hides My courses when the student has no department', () => {
    mocks.departmentId = null
    renderSidebar()
    expect(screen.queryByRole('region', { name: 'My courses' })).not.toBeInTheDocument()
  })

  it('hides My courses when the student has no year', () => {
    mocks.yearLevel = null
    renderSidebar()
    expect(screen.queryByRole('region', { name: 'My courses' })).not.toBeInTheDocument()
  })

  it('shows the moderation group to admins only, with user management for admins', () => {
    mocks.role = 'STUDENT'
    const { unmount } = renderSidebar()
    expect(screen.queryByRole('region', { name: 'Moderation' })).not.toBeInTheDocument()
    unmount()

    mocks.role = 'ADMIN'
    renderSidebar()
    const moderation = within(screen.getByRole('region', { name: 'Moderation' }))
    expect(moderation.getByRole('link', { name: 'Moderation' })).toHaveAttribute(
      'href',
      '/admin/moderation',
    )
    expect(moderation.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users')
  })

  it('marks Campus active only on the campus tab', () => {
    renderSidebar('campus')
    expect(screen.getByRole('link', { name: 'Campus' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })

  it('marks neither Today nor Campus in the sidebar until the tab is known', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppSidebar tab={undefined} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Campus' })).not.toHaveAttribute('aria-current')
  })

  it('labels the collapsed moderation group and the collapsed share button', async () => {
    mocks.role = 'ADMIN'
    useUIStore.setState({ sidebarCollapsed: true })
    renderSidebar()
    expect(screen.getByRole('region', { name: 'Moderation' })).toBeInTheDocument()
    const share = screen.getByRole('link', { name: 'Share a note' })
    await userEvent.hover(share)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Share a note')
    expect(screen.queryByRole('region', { name: 'My courses' })).not.toBeInTheDocument()
  })

  it('caps unread badges at 99+ and persists collapse state', async () => {
    mocks.unreadChat = 120
    renderSidebar()
    expect(screen.getByText('99+')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
  })

  it('switches between light and dark from the bottom toggle', async () => {
    renderSidebar()
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(mocks.setTheme).toHaveBeenCalledWith('theme-catppuccin-mocha')
  })

  describe('a guest', () => {
    beforeEach(() => {
      mocks.authenticated = false
      mocks.guest = true
    })

    it('gets Today, Courses, Campus and Profile, and no signed-in items', () => {
      renderSidebar()
      const nav = within(primaryNav())
      expect(nav.getByRole('link', { name: 'Today' })).toBeInTheDocument()
      expect(nav.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
      expect(nav.getByRole('link', { name: 'Campus' })).toBeInTheDocument()
      expect(nav.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
      expect(nav.queryByRole('link', { name: /Chat/ })).not.toBeInTheDocument()
      expect(nav.queryByRole('link', { name: 'Share a note' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Leave guest mode' })).toBeInTheDocument()
    })

    it('signs in on uniauth straight from the sidebar, not via /login', async () => {
      renderSidebar()
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
    })
  })
})

describe('phone navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/feed'
    mocks.authenticated = true
    mocks.guest = false
    mocks.unreadChat = 4
    mocks.notificationCount = 2
    mocks.signInWithUniauth.mockClear()
  })

  it('renders the four bottom tabs', () => {
    render(<MobileNav />)
    const tabs = within(screen.getByRole('navigation', { name: 'Primary tabs' }))
    expect(tabs.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Today',
      'Courses',
      'Campus',
      'Me',
    ])
    expect(tabs.getByRole('link', { name: 'Me' })).toHaveAttribute('href', '/profile')
  })

  it('marks neither Today nor Campus until the client knows the tab', () => {
    render(<MobileNav tab={undefined} />)
    const tabs = within(screen.getByRole('navigation', { name: 'Primary tabs' }))
    expect(tabs.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
    expect(tabs.getByRole('link', { name: 'Campus' })).not.toHaveAttribute('aria-current')
  })

  it('sizes the phone top bar as 56px plus the notch inset, outside the padding', () => {
    render(<MobileNav />)
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('box-content', 'h-14', 'pt-[env(safe-area-inset-top)]')
  })

  it('marks Campus active on the campus tab', () => {
    render(<MobileNav tab="campus" />)
    const tabs = within(screen.getByRole('navigation', { name: 'Primary tabs' }))
    expect(tabs.getByRole('link', { name: 'Campus' })).toHaveAttribute('aria-current', 'page')
    expect(tabs.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })

  it('renders the same navigation without a tab, so static pages send it from the server', () => {
    const html = renderToStaticMarkup(<MobileNav />)
    expect(html).toContain('aria-label="Primary tabs"')
    expect(html).toContain('href="/feed?tab=campus"')
    const sidebar = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AppSidebar />
      </QueryClientProvider>,
    )
    expect(sidebar).toContain('aria-label="Primary"')
  })

  it('puts Share a note, chat and notifications in the top bar, with badges', () => {
    render(<MobileNav />)
    expect(screen.getByRole('link', { name: 'Share a note' })).toHaveAttribute('href', '/posts/new')
    expect(screen.getByRole('link', { name: 'Chat (4 unread)' })).toHaveAttribute('href', '/chat')
    expect(screen.getByRole('link', { name: 'Notifications (2 unread)' })).toHaveAttribute(
      'href',
      '/notifications',
    )
  })

  it('shows a guest the four tabs and a sign-in button, with no share or chat', async () => {
    mocks.authenticated = false
    mocks.guest = true
    render(<MobileNav />)
    expect(screen.queryByRole('link', { name: 'Share a note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Chat/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
  })
})

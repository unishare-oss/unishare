import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AppShell } from '@/components/app-shell'
import { useUIStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({
  pathname: '/feed',
  auth: {
    session: null,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isGuest: false,
  } as {
    session: { user: { isAnonymous?: boolean } } | null
    user: {
      university: { id: string } | null
      department: { id: string } | null
      role?: string
    } | null
    isLoading: boolean
    isAuthenticated: boolean
    isGuest: boolean
  },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/hooks/use-notifications', () => ({ useNotificationStream: vi.fn() }))
vi.mock('@/components/app-sidebar', () => ({
  AppSidebar: () => <aside data-testid="desktop-nav" />,
}))
vi.mock('@/components/mobile-nav', () => ({ MobileNav: () => <nav data-testid="mobile-nav" /> }))
vi.mock('@/components/academic-profile-modal', () => ({ AcademicProfileModal: () => null }))
vi.mock('@/components/shared/background-upload-manager', () => ({
  BackgroundUploadManager: () => null,
}))
vi.mock('@/components/guest-university-picker', () => ({
  GuestUniversityPicker: () => <p>Guest picker</p>,
}))
vi.mock('@/components/shared/loading-spinner', () => ({ LoadingSpinner: () => <span /> }))

describe('AppShell navigation layout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.pathname = '/feed'
    mocks.auth = {
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isGuest: false,
    }
    useUIStore.setState({ sidebarCollapsed: false })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('tracks expanded and collapsed sidebar widths', () => {
    const { rerender } = render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    )
    act(() => vi.advanceTimersByTime(1000))
    const main = screen.getByRole('main')
    expect(main).toHaveClass('md:ml-[232px]')
    act(() => useUIStore.setState({ sidebarCollapsed: true }))
    rerender(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    )
    expect(main).toHaveClass('md:ml-[72px]')
  })

  it('keeps chat full-height and hides the dock inside rooms', () => {
    mocks.pathname = '/chat/room-1'
    render(
      <AppShell>
        <p>Chat</p>
      </AppShell>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('main')).toHaveClass('h-screen', 'overflow-hidden')
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
  })

  it('lets sticky headers sit under the phone top bar, only below md', () => {
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('main')).toHaveClass(
      'pt-[calc(3.5rem+env(safe-area-inset-top))]',
      'md:pt-0',
      'max-md:[--mobile-topbar-h:calc(3.5rem+env(safe-area-inset-top))]',
    )
  })

  describe('member without a university', () => {
    const signedIn = (isAnonymous: boolean) => {
      mocks.auth = {
        session: { user: { isAnonymous } },
        user: { university: null, department: null },
        isLoading: false,
        isAuthenticated: !isAnonymous,
        isGuest: isAnonymous,
      }
    }
    const renderPage = () => {
      render(
        <AppShell>
          <p>Page content</p>
        </AppShell>,
      )
      act(() => vi.advanceTimersByTime(1000))
    }

    it('sees the pick-your-university notice instead of the page', () => {
      signedIn(false)
      renderPage()
      expect(screen.queryByText('Page content')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Pick your university' })).toHaveAttribute(
        'href',
        expect.stringContaining('/select-university?redirect='),
      )
    })

    it('is not shown to a guest, who gets the guest picker instead of the page', () => {
      signedIn(true)
      renderPage()
      expect(screen.queryByRole('link', { name: 'Pick your university' })).not.toBeInTheDocument()
      expect(screen.getByText('Guest picker')).toBeInTheDocument()
      expect(screen.queryByText('Page content')).not.toBeInTheDocument()
    })

    it('shows a guest the page once it picked a university', () => {
      signedIn(true)
      mocks.auth.user = { university: { id: 'u1' }, department: null }
      renderPage()
      expect(screen.getByText('Page content')).toBeInTheDocument()
      expect(screen.queryByText('Guest picker')).not.toBeInTheDocument()
    })

    it('is not shown to an admin, who reads every university', () => {
      signedIn(false)
      mocks.auth.user = { university: null, department: { id: 'd1' }, role: 'ADMIN' }
      renderPage()
      expect(screen.queryByRole('link', { name: 'Pick your university' })).not.toBeInTheDocument()
      expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('shows the page once the member has a university', () => {
      signedIn(false)
      mocks.auth.user = { university: { id: 'u1' }, department: null }
      renderPage()
      expect(screen.getByText('Page content')).toBeInTheDocument()
    })
  })
})

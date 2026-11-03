import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AppShell } from '@/components/app-shell'
import { useUIStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({
  pathname: '/feed',
  auth: { session: null, user: null, isLoading: false, isAuthenticated: false } as {
    session: { user: { isAnonymous?: boolean } } | null
    user: { university: { id: string } | null; department: { id: string } | null } | null
    isLoading: boolean
    isAuthenticated: boolean
  },
}))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/hooks/use-notifications', () => ({ useNotificationStream: vi.fn() }))
vi.mock('@/components/app-rail', () => ({ AppRail: () => <aside data-testid="desktop-nav" /> }))
vi.mock('@/components/mobile-nav', () => ({ MobileNav: () => <nav data-testid="mobile-nav" /> }))
vi.mock('@/components/academic-profile-modal', () => ({ AcademicProfileModal: () => null }))
vi.mock('@/components/shared/background-upload-manager', () => ({
  BackgroundUploadManager: () => null,
}))
vi.mock('@/components/shared/loading-spinner', () => ({ LoadingSpinner: () => <span /> }))

describe('AppShell navigation layout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.pathname = '/feed'
    mocks.auth = { session: null, user: null, isLoading: false, isAuthenticated: false }
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

  describe('member without a university', () => {
    const signedIn = (isAnonymous: boolean) => {
      mocks.auth = {
        session: { user: { isAnonymous } },
        user: { university: null, department: null },
        isLoading: false,
        isAuthenticated: true,
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

    it('is not shown to a guest', () => {
      signedIn(true)
      renderPage()
      expect(screen.getByText('Page content')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Pick your university' })).not.toBeInTheDocument()
    })

    it('shows the page once the member has a university', () => {
      signedIn(false)
      mocks.auth.user = { university: { id: 'u1' }, department: null }
      renderPage()
      expect(screen.getByText('Page content')).toBeInTheDocument()
    })
  })
})

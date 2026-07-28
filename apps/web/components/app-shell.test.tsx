import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AppShell } from '@/components/app-shell'
import { useUIStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({ pathname: '/feed' }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}))
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
    useUIStore.setState({ sidebarCollapsed: false })
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
})

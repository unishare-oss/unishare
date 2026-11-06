import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

const replace = vi.fn()
const auth = vi.hoisted(() => ({
  value: { isLoading: false, isAuthenticated: false, isGuest: false },
  pathname: '/requests',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => auth.pathname,
}))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => auth.value }))

const { AuthGuard } = await import('./auth-guard')

describe('AuthGuard', () => {
  beforeEach(() => {
    replace.mockClear()
    auth.pathname = '/requests'
  })

  it('sends a signed-out visitor to login', () => {
    auth.value = { isLoading: false, isAuthenticated: false, isGuest: false }
    render(<AuthGuard>page</AuthGuard>)
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('sends a guest back to the feed, since login cannot start a second guest session', () => {
    auth.value = { isLoading: false, isAuthenticated: false, isGuest: true }
    render(<AuthGuard>page</AuthGuard>)
    expect(replace).toHaveBeenCalledWith('/feed')
  })

  it('shows the page to a member', () => {
    auth.value = { isLoading: false, isAuthenticated: true, isGuest: false }
    const { getByText } = render(<AuthGuard>page</AuthGuard>)
    expect(getByText('page')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('lets a guest into the pages listed in allowGuestsOn, and their subpages', () => {
    auth.value = { isLoading: false, isAuthenticated: false, isGuest: true }
    for (const path of ['/boards', '/profile', '/boards/new']) {
      auth.pathname = path
      const { getByText, unmount } = render(
        <AuthGuard allowGuestsOn={['/boards', '/profile']}>page</AuthGuard>,
      )
      expect(getByText('page')).toBeInTheDocument()
      unmount()
    }
    expect(replace).not.toHaveBeenCalled()
  })

  it('still sends a guest away from the other pages, and signed-out visitors from all', () => {
    auth.value = { isLoading: false, isAuthenticated: false, isGuest: true }
    auth.pathname = '/requests'
    render(<AuthGuard allowGuestsOn={['/boards', '/profile']}>page</AuthGuard>)
    expect(replace).toHaveBeenCalledWith('/feed')

    replace.mockClear()
    auth.value = { isLoading: false, isAuthenticated: false, isGuest: false }
    auth.pathname = '/boards'
    render(<AuthGuard allowGuestsOn={['/boards', '/profile']}>page</AuthGuard>)
    expect(replace).toHaveBeenCalledWith('/login')
  })
})

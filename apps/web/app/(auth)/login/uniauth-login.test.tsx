import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const params = { error: null as string | null, next: null as string | null }

vi.mock('@/src/lib/auth/mode', () => ({ uniauthURL: 'http://auth.test' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'error' ? params.error : key === 'next' ? params.next : null),
  }),
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({ data: [] }),
}))
vi.mock('@/src/lib/auth/client', () => ({
  authClient: { signIn: { social: vi.fn(), anonymous: vi.fn() } },
}))

// Imported after the mocks.
const { default: LoginPage } = await import('./page')
const { authClient } = await import('@/src/lib/auth/client')

describe('login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    params.error = null
    params.next = null
    sessionStorage.clear()
    // Most tests are about the button, shown once the silent check has already happened.
    document.cookie = 'unishare_uniauth_checked=1; Path=/'
  })

  it('first checks uniauth silently and returns to the protected page', () => {
    document.cookie = 'unishare_uniauth_checked=; Max-Age=0; Path=/'
    params.next = '/profile'
    render(<LoginPage />)
    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: 'uniauth',
      callbackURL: `${window.location.origin}/profile`,
      errorCallbackURL: `${window.location.origin}/auth/return`,
      additionalParams: { prompt: 'none' },
    })
    // login_required must come back to this page (not to /profile as a guest).
    expect(sessionStorage.getItem('unishare:uniauth-return-to')).toBe(window.location.href)
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
  })

  it('ignores a next that leaves the site', async () => {
    params.next = '//evil.example/x'
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(authClient.signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: `${window.location.origin}/feed` }),
    )
  })

  it('offers uniauth sign-in and guest access, not the password form', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('Password')).toBeNull()
  })

  it('starts an interactive uniauth sign-in that returns to the feed', async () => {
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: 'uniauth',
      callbackURL: `${window.location.origin}/feed`,
      errorCallbackURL: `${window.location.origin}/auth/return`,
    })
  })

  it('starts a guest (anonymous) session, since content needs one', async () => {
    vi.mocked(authClient.signIn.anonymous).mockResolvedValue({ data: null, error: { status: 500 } })
    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Continue as guest' }))
    expect(authClient.signIn.anonymous).toHaveBeenCalled()
  })

  it('explains real errors but stays quiet about login_required', () => {
    params.error = 'BANNED_USER'
    const { unmount } = render(<LoginPage />)
    expect(screen.getByText('Your Unishare account has been suspended.')).toBeTruthy()
    unmount()
    params.error = 'login_required'
    render(<LoginPage />)
    expect(screen.queryByText(/failed|suspended/i)).toBeNull()
  })
})

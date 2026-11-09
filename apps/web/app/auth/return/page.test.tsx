import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const signInWithUniauth = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const takeReturnTo = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/auth/uniauth', () => ({ signInWithUniauth, takeReturnTo }))

const { default: UniauthReturnPage } = await import('./page')

const replace = vi.fn()
const realLocation = window.location

function visit(search: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, origin: realLocation.origin, search, replace },
  })
  render(<UniauthReturnPage />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
})

// Lives outside the (auth) group: its GuestGuard would send a signed-in user to / before this
// runs, and /auth/refresh is a silent sign-in by someone already signed in.
describe('/auth/return', () => {
  it('goes back to the page the sign-in started from on login_required', () => {
    takeReturnTo.mockReturnValue('/profile')
    visit('?error=login_required')
    expect(replace).toHaveBeenCalledWith('/profile')
  })

  it('starts an interactive sign-in back to that page on interaction_required', () => {
    takeReturnTo.mockReturnValue('/profile')
    visit('?error=interaction_required')
    expect(signInWithUniauth).toHaveBeenCalledWith({
      returnTo: `${realLocation.origin}/profile`,
    })
  })

  it('explains any other error on /login', () => {
    takeReturnTo.mockReturnValue(null)
    visit('?error=access_denied')
    expect(replace).toHaveBeenCalledWith('/login?error=access_denied')
  })
})

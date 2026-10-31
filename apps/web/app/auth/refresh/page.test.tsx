import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const signInWithUniauth = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/src/lib/auth/uniauth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/auth/uniauth')>()),
  signInWithUniauth,
}))
vi.mock('@/src/lib/auth/client', () => ({ authClient: {} }))

const { default: UniauthRefreshPage } = await import('./page')

afterEach(() => {
  cleanup()
  signInWithUniauth.mockClear()
})

function visit(search: string) {
  window.history.replaceState(null, '', `/auth/refresh${search}`)
  render(
    <StrictMode>
      <UniauthRefreshPage />
    </StrictMode>,
  )
}

describe('/auth/refresh', () => {
  it('runs one silent uniauth sign-in back to `to`', () => {
    visit('?to=%2Fprofile')
    expect(screen.getByText('Updating your profile…')).toBeInTheDocument()
    expect(signInWithUniauth).toHaveBeenCalledTimes(1)
    expect(signInWithUniauth).toHaveBeenCalledWith({
      returnTo: `${window.location.origin}/profile`,
      silent: true,
    })
  })

  it('goes on to `to` when the sign-in cannot start', async () => {
    const realLocation = window.location
    const replace = vi.fn()
    signInWithUniauth.mockRejectedValueOnce(new Error('network'))
    window.history.replaceState(null, '', '/auth/refresh?to=%2Fprofile')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, origin: realLocation.origin, search: '?to=%2Fprofile', replace },
    })
    try {
      render(<UniauthRefreshPage />)
      await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/profile'))
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    }
  })

  it.each(['?to=%2F%2Fevil.example', '?to=https%3A%2F%2Fevil.example', ''])(
    'lands on /feed for %j',
    (search) => {
      visit(search)
      expect(signInWithUniauth).toHaveBeenCalledWith({
        returnTo: `${window.location.origin}/feed`,
        silent: true,
      })
    },
  )
})

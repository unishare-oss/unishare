import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadMode() {
  vi.stubEnv('NEXT_PUBLIC_UNIAUTH_URL', 'https://auth.example')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example/')
  vi.resetModules()
  return import('./mode')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('uniauth links', () => {
  it('sends the account page back through /auth/refresh', async () => {
    const { uniauthAccountURL } = await loadMode()
    expect(uniauthAccountURL('/profile')).toBe(
      'https://auth.example/account?redirect=https%3A%2F%2Fapp.example%2Fauth%2Frefresh%3Fto%3D%252Fprofile',
    )
  })

  it('sends the university picker back through /auth/refresh', async () => {
    const { uniauthPickUniversityURL } = await loadMode()
    const url = new URL(uniauthPickUniversityURL('/profile'))
    expect(url.origin + url.pathname).toBe('https://auth.example/select-university')
    expect(url.searchParams.get('redirect')).toBe('https://app.example/auth/refresh?to=%2Fprofile')
  })
})

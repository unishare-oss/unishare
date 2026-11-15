import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

vi.mock('@/src/lib/auth/mode', () => ({ uniauthURL: 'http://auth.test' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({ data: [] }),
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, session: null, isAuthenticated: false }),
}))
vi.mock('@/src/lib/auth/client', () => ({
  authClient: { signIn: { social: vi.fn(), anonymous: vi.fn() } },
}))

// Imported after the mocks.
const { LandingNav } = await import('@/components/landing/landing-nav')
const { LandingHero } = await import('@/components/landing/landing-hero')
const { LandingCta } = await import('@/components/landing/landing-cta')
const { default: LoginPage } = await import('./(auth)/login/page')

const BRAND_SCREENS: { name: string; render: () => ReactElement; main: RegExp }[] = [
  {
    name: 'landing top',
    render: () => (
      <>
        <LandingNav />
        <LandingHero />
      </>
    ),
    main: /^Get started/,
  },
  { name: 'landing closing CTA', render: () => <LandingCta />, main: /^Create your account$/ },
  { name: 'login', render: () => <LoginPage />, main: /^Continue$/ },
]

describe('landing and auth screens', () => {
  beforeEach(() => {
    // Shows the Continue button on the login screen (the silent check has already run).
    document.cookie = 'unishare_uniauth_checked=1; Path=/'
  })

  it.each(BRAND_SCREENS)(
    'each landing and auth screen has at most one brand button, on its main action ($name)',
    ({ render: renderScreen, main }) => {
      const { unmount } = render(renderScreen())
      const brands = document.querySelectorAll<HTMLElement>('[data-variant="brand"]')
      expect(brands).toHaveLength(1)
      expect(brands[0]).toHaveAccessibleName(main)
      unmount()
    },
  )
})

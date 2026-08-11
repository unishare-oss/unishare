import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'
import { authClient } from '@/src/lib/auth/client'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({ data: [] }),
}))
vi.mock('@/src/lib/auth/client', () => ({
  authClient: {
    signIn: { social: vi.fn(), email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}))

describe('MCP login continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(
      {},
      '',
      '/login?client_id=client-1&state=signed-state&code_challenge=challenge',
    )
  })

  it.each(['Google', 'Microsoft'])(
    'preserves the authorization request for %s login',
    async (name) => {
      render(<LoginPage />)
      await userEvent.click(screen.getByRole('button', { name: `Continue with ${name}` }))

      expect(authClient.signIn.social).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: name.toLowerCase(),
          callbackURL: expect.stringContaining(
            '/api/auth/mcp/authorize?client_id=client-1&state=signed-state&code_challenge=challenge',
          ),
        }),
      )
    },
  )
})

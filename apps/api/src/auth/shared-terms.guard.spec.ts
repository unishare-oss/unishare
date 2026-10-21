import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SharedTermsGuard } from './shared-terms.guard'

const mockAuthenticate = jest.fn().mockResolvedValue(true)
jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthGuard: class {
    canActivate() {
      return mockAuthenticate()
    }
  },
}))
jest.mock('./auth.config', () => ({ auth: {} }))

describe('SharedTermsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector
  const guard = new SharedTermsGuard(reflector)
  const context = (user: object, path = '/api/posts') =>
    ({
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ path, user }) }),
    }) as unknown as ExecutionContext
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticate.mockResolvedValue(true)
  })
  it('requires central evidence rather than old app-only consent', async () => {
    await expect(guard.canActivate(context({ consentGivenAt: new Date() }))).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(mockAuthenticate).toHaveBeenCalledTimes(1)
  })
  it('allows current shared acceptance and recovery/account access', async () => {
    await expect(
      guard.canActivate(context({ unicorpTermsVersion: 1, unicorpTermsAcceptedAt: new Date() })),
    ).resolves.toBe(true)
    await expect(guard.canActivate(context({}, '/api/users/me'))).resolves.toBe(true)
  })
  it('preserves the existing authentication and authorization refusal', async () => {
    mockAuthenticate.mockRejectedValue(new Error('forbidden role'))
    await expect(
      guard.canActivate(context({ unicorpTermsVersion: 1, unicorpTermsAcceptedAt: new Date() })),
    ).rejects.toThrow('forbidden role')
  })
  it('preserves public and anonymous routes', async () => {
    await expect(guard.canActivate(context({ isAnonymous: true }))).resolves.toBe(true)
    jest.mocked(reflector.getAllAndOverride).mockReturnValueOnce(true)
    await expect(guard.canActivate(context({}))).resolves.toBe(true)
  })
})

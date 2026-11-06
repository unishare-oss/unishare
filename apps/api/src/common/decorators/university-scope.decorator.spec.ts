import { ExecutionContext } from '@nestjs/common'
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'
import { UniversityScopeParam } from './university-scope.decorator'

class Dummy {
  handler(@UniversityScopeParam() _scope: unknown) {}
}

function scopeFor(session: unknown) {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Dummy, 'handler') as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >
  const { factory } = Object.values(args)[0]
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ session }) }),
  } as unknown as ExecutionContext
  return factory(undefined, ctx)
}

describe('UniversityScopeParam', () => {
  it('reads the member’s university from the session Better Auth put on the request', () => {
    expect(scopeFor({ user: { role: 'STUDENT', universityId: 'u1' } })).toEqual({
      kind: 'university',
      universityId: 'u1',
    })
  })

  it('gives an admin every university', () => {
    expect(scopeFor({ user: { role: 'ADMIN', universityId: null } })).toEqual({ kind: 'all' })
  })

  // The guard sets `session` to null on a signed-out @OptionalAuth request.
  it('gives a signed-out request nothing', () => {
    expect(scopeFor(null)).toEqual({ kind: 'none' })
  })
})

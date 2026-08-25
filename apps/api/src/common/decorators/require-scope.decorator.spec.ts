import { ForbiddenException } from '@nestjs/common'
import { RequireScope, getRequiredScopes } from './require-scope.decorator'

class Dummy {
  @RequireScope('posts:write')
  async scoped(_session: { scopes: string }) {
    return 'ok'
  }

  async unscoped(_session: { scopes: string }) {
    return 'ok'
  }
}

describe('RequireScope', () => {
  const instance = new Dummy()

  it('allows the call when the session has the required scope', async () => {
    await expect(instance.scoped({ scopes: 'openid posts:write' })).resolves.toBe('ok')
  })

  it('rejects the call when the session lacks the required scope', async () => {
    await expect(instance.scoped({ scopes: 'openid posts:read' })).rejects.toThrow(
      new ForbiddenException('Missing required scope: posts:write'),
    )
  })

  it('rejects when scopes is missing entirely', async () => {
    await expect(instance.scoped({} as { scopes: string })).rejects.toThrow(ForbiddenException)
  })
})

describe('getRequiredScopes', () => {
  const instance = new Dummy()

  it('returns the scopes declared on a decorated method', () => {
    expect(getRequiredScopes(instance.scoped)).toEqual(['posts:write'])
  })

  it('returns an empty array for an undecorated method', () => {
    expect(getRequiredScopes(instance.unscoped)).toEqual([])
  })
})

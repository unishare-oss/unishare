import { createAuditHooks } from './audit-hooks'

jest.mock('better-auth/api', () => ({
  createAuthMiddleware: (fn: unknown) => fn,
  isAPIError: (value: unknown) => value instanceof Error,
  getSessionFromCtx: jest.fn(async () => ({
    user: { id: 'admin-1', name: 'Root', role: 'ADMIN' },
  })),
}))

type Hook = (ctx: unknown) => Promise<void>

describe('Better Auth audit hooks', () => {
  const flush = () => new Promise((resolve) => setImmediate(resolve))
  let client: { auditLog: { create: jest.Mock }; user: { findUnique: jest.Mock } }
  let before: Hook
  let after: Hook

  beforeEach(() => {
    client = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Ada', role: 'STUDENT' }) },
    }
    const hooks = createAuditHooks(client as never) as unknown as { before: Hook; after: Hook }
    before = hooks.before
    after = hooks.after
  })

  function ctx(path: string, body: Record<string, unknown>, returned: unknown = {}) {
    const request = new Request('http://localhost/api/auth' + path, {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'jest' },
    })
    return { path, body, request, context: { returned } }
  }

  it('records the role a user had before a role change', async () => {
    const c = ctx('/admin/set-role', { userId: 'u1', role: 'MODERATOR' })
    await before(c)
    // The change has been applied by the time the after hook runs.
    client.user.findUnique.mockResolvedValue({ name: 'Ada', role: 'MODERATOR' })
    await after(c)
    await flush()

    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'user.set_role',
        actorId: 'admin-1',
        targetId: 'u1',
        metadata: { targetName: 'Ada', from: 'STUDENT', to: 'MODERATOR' },
        ip: '203.0.113.9',
      }),
    })
  })

  it('keeps the name of a user an admin removed', async () => {
    const c = ctx('/admin/remove-user', { userId: 'u1' })
    await before(c)
    client.user.findUnique.mockResolvedValue(null)
    await after(c)
    await flush()
    expect(client.auditLog.create.mock.calls[0][0].data.metadata).toEqual({ targetName: 'Ada' })
  })

  it('records nothing when the admin action failed', async () => {
    const c = ctx('/admin/ban-user', { userId: 'u1' }, new Error('forbidden'))
    await before(c)
    await after(c)
    await flush()
    expect(client.auditLog.create).not.toHaveBeenCalled()
  })

  it('ignores routes it does not audit', async () => {
    const c = ctx('/get-session', {})
    await before(c)
    await after(c)
    await flush()
    expect(client.user.findUnique).not.toHaveBeenCalled()
    expect(client.auditLog.create).not.toHaveBeenCalled()
  })
})

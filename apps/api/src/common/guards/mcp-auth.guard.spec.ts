import { ExecutionContext } from '@nestjs/common'
import { auth } from '@/auth/auth.config'
import { McpAuthGuard } from './mcp-auth.guard'

jest.mock('@/auth/auth.config', () => ({
  auth: { api: { getMcpSession: jest.fn() } },
}))

function contextFor(req: Record<string, unknown>, res: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext
}

describe('McpAuthGuard', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) }
  const guard = new McpAuthGuard(config as never)
  const getMcpSession = auth.api.getMcpSession as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('attaches the session to the request and allows the call through', async () => {
    getMcpSession.mockResolvedValue({ userId: 'user-1', scopes: 'openid posts:write' })
    const req: Record<string, unknown> = { headers: {} }
    const res = {}

    const result = await guard.canActivate(contextFor(req, res))

    expect(result).toBe(true)
    expect(req.mcpSession).toEqual({ userId: 'user-1', scopes: 'openid posts:write' })
  })

  it('rejects with a JSON-RPC 401 and does not attach a session when unauthenticated', async () => {
    getMcpSession.mockResolvedValue(null)
    const req: Record<string, unknown> = { headers: {} }
    const set = jest.fn().mockReturnThis()
    const json = jest.fn().mockReturnThis()
    const status = jest.fn().mockReturnValue({ set, json })
    const res = { status }

    const result = await guard.canActivate(contextFor(req, res))

    expect(result).toBe(false)
    expect(req.mcpSession).toBeUndefined()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Authentication required' },
      }),
    )
  })
})

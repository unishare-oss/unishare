import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request, Response } from 'express'
import { auth } from '@/auth/auth.config'
import type { McpAuthSession } from '@/modules/mcp/mcp.repository'

export interface RequestWithMcpSession extends Request {
  mcpSession?: McpAuthSession
}

/**
 * Fetches the MCP OAuth session and attaches it to the request.
 *
 * McpController uses @OptionalAuth() and manages its own auth — Better Auth's MCP plugin is
 * a separate OAuth token flow from the cookie session every other route relies on, so
 * `req.session` is never populated here. Runs before UserThrottlerGuard so it can key rate
 * limits by user instead of falling back to IP.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithMcpSession>()
    const res = context.switchToHttp().getResponse<Response>()

    const session = await auth.api.getMcpSession({ headers: fromNodeHeaders(req.headers) })
    if (!session) {
      const authURL = this.config.get<string>('BETTER_AUTH_URL') ?? 'http://localhost:3001'
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          `Bearer resource_metadata="${authURL}/.well-known/oauth-protected-resource"`,
        )
        .set('Access-Control-Expose-Headers', 'WWW-Authenticate')
        .json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Authentication required' },
          id: null,
        })
      return false
    }

    req.mcpSession = session
    return true
  }
}

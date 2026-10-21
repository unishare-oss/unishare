import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request, Response } from 'express'
import { PrismaService } from '@/prisma/prisma.service'
import type { McpAuthSession } from '@/modules/mcp/dto/mcp-auth-session.dto'
import {
  bearerToken,
  mcpResource,
  resolveLocalUserId,
  verifyMcpAccessToken,
} from '@/modules/mcp/mcp-token.verifier'

export interface RequestWithMcpSession extends Request {
  mcpSession?: McpAuthSession
}

/**
 * Verifies the MCP bearer token (a uniauth JWT, checked locally against its JWKS) and
 * attaches the matching unishare user's session to the request.
 *
 * McpController uses @OptionalAuth() and manages its own auth — MCP is a separate OAuth token
 * flow from the cookie session every other route relies on. A request
 * can still carry a valid session cookie alongside its bearer token, so `req.session` is not
 * guaranteed to be empty here; UserThrottlerGuard, which runs after this guard, must prefer
 * `req.mcpSession` over `req.session` for that reason.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithMcpSession>()
    const res = context.switchToHttp().getResponse<Response>()

    const session = await this.uniauthSession(bearerToken(req.headers.authorization) ?? '')
    if (!session) {
      // Metadata lives next to the resource (RFC 9728 path-suffixed form).
      const metadataURL = `${new URL(mcpResource).origin}/.well-known/oauth-protected-resource/mcp`
      res
        .status(401)
        .set('WWW-Authenticate', `Bearer resource_metadata="${metadataURL}"`)
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

  /** Valid uniauth token → session for the matching unishare user (null if they have none). */
  private async uniauthSession(token: string): Promise<McpAuthSession | null> {
    const verified = await verifyMcpAccessToken(token)
    if (!verified) return null
    const userId = await resolveLocalUserId(this.prisma, verified.userId)
    if (!userId) return null
    // Suspended on uniauth: a still-valid agent token must not keep working (403, not a token problem).
    const holder = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityStatus: true },
    })
    if (holder?.identityStatus === 'suspended') {
      throw new ForbiddenException({
        code: 'account_suspended',
        message: 'This account is suspended',
      })
    }
    return { ...verified, userId }
  }
}

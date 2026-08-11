import { All, Controller, Get, Logger, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { fromNodeHeaders } from 'better-auth/node'
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins'
import type { Request, Response } from 'express'
import { auth } from '@/auth/auth.config'
import { McpService } from './mcp.service'

const oauthDiscoveryHandler = oAuthDiscoveryMetadata(auth)
const protectedResourceHandler = oAuthProtectedResourceMetadata(auth)

@ApiExcludeController()
@OptionalAuth()
@Controller()
export class McpController {
  private readonly logger = new Logger(McpController.name)

  constructor(private readonly mcpService: McpService) {}

  @Get('.well-known/oauth-authorization-server')
  discovery(@Req() req: Request, @Res() res: Response) {
    return this.sendWebResponse(oauthDiscoveryHandler(this.toWebRequest(req)), res)
  }

  @Get(['.well-known/oauth-protected-resource', '.well-known/oauth-protected-resource/mcp'])
  protectedResource(@Req() req: Request, @Res() res: Response) {
    return this.sendWebResponse(protectedResourceHandler(this.toWebRequest(req)), res)
  }

  @All('mcp')
  async handle(@Req() req: Request, @Res() res: Response) {
    const session = await auth.api.getMcpSession({ headers: fromNodeHeaders(req.headers) })

    if (!session) {
      const authURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'
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
      return
    }

    try {
      await this.mcpService.handleRequest(req, res, session, req.body)
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'MCP request failed')
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        })
      }
    }
  }

  private toWebRequest(req: Request) {
    const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'
    return new globalThis.Request(new URL(req.originalUrl, origin), {
      method: req.method,
      headers: fromNodeHeaders(req.headers),
    })
  }

  private async sendWebResponse(responsePromise: Promise<globalThis.Response>, res: Response) {
    const response = await responsePromise
    response.headers.forEach((value, name) => res.set(name, value))
    res.status(response.status).send(await response.text())
  }
}

import { All, Controller, Get, Logger, Req, Res, UseFilters, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { fromNodeHeaders } from 'better-auth/node'
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins'
import { Throttle } from '@nestjs/throttler'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { auth } from '@/auth/auth.config'
import { McpExceptionFilter } from '@/common/filters/mcp-exception.filter'
import { McpAuthGuard, type RequestWithMcpSession } from '@/common/guards/mcp-auth.guard'
import { UserThrottlerGuard } from '@/common/guards/user-throttler.guard'
import { McpService } from './mcp.service'

const oauthDiscoveryHandler = oAuthDiscoveryMetadata(auth)
const protectedResourceHandler = oAuthProtectedResourceMetadata(auth)

@ApiExcludeController()
@OptionalAuth()
@UseFilters(McpExceptionFilter)
@Controller()
export class McpController {
  private readonly logger = new Logger(McpController.name)

  constructor(
    private readonly mcpService: McpService,
    private readonly config: ConfigService,
  ) {}

  @Get('.well-known/oauth-authorization-server')
  discovery(@Req() req: Request, @Res() res: Response) {
    return this.sendWebResponse(oauthDiscoveryHandler(this.toWebRequest(req)), res)
  }

  @Get(['.well-known/oauth-protected-resource', '.well-known/oauth-protected-resource/mcp'])
  protectedResource(@Req() req: Request, @Res() res: Response) {
    return this.sendWebResponse(protectedResourceHandler(this.toWebRequest(req)), res)
  }

  @All('mcp')
  @UseGuards(McpAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async handle(@Req() req: RequestWithMcpSession, @Res() res: Response) {
    try {
      await this.mcpService.handleRequest(req, res, req.mcpSession!, req.body)
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
    const origin =
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('BETTER_AUTH_URL') ??
      'http://localhost:3000'
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

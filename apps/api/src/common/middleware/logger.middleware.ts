import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { context, trace } from '@opentelemetry/api'

// Probe and scrape endpoints are hit every few seconds and would drown out real traffic.
const UNLOGGED_PATHS = new Set(['/health', '/metrics'])

export const TRACE_ID_HEADER = 'X-Trace-Id'

type RequestWithUser = Request & {
  user?: { id?: string }
  session?: { user?: { id?: string } }
}

// Internal id only (never email/name) so a bug report without an Error ID can
// still be found by filtering Loki on user_id around the reported time.
function getUserId(request: Request) {
  const { user, session } = request as RequestWithUser
  return user?.id ?? session?.user?.id
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name)

  use(request: Request, response: Response, next: NextFunction) {
    const { method, originalUrl } = request
    const startedAt = Date.now()
    const spanContext = trace.getSpan(context.active())?.spanContext()

    // prevent Cloudflare and browsers from caching API responses
    if (!originalUrl.includes('/stream')) {
      response.setHeader('Cache-Control', 'no-store')
    }

    // Lets the web app show users an "Error ID" they can paste into a bug report.
    if (spanContext) {
      response.setHeader(TRACE_ID_HEADER, spanContext.traceId)
    }

    if (UNLOGGED_PATHS.has(request.path)) {
      return next()
    }

    response.once('finish', () => {
      const responseTime = Date.now() - startedAt
      this.logger.log({
        event: 'http.request.completed',
        method,
        route: request.route?.path ?? 'unmatched',
        status_code: response.statusCode,
        duration_ms: responseTime,
        user_id: getUserId(request),
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId,
      })
    })

    next()
  }
}

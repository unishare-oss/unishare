import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { context, trace } from '@opentelemetry/api'

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

    response.once('finish', () => {
      const responseTime = Date.now() - startedAt
      this.logger.log(
        JSON.stringify({
          event: 'http.request.completed',
          method,
          route: request.route?.path ?? 'unmatched',
          status_code: response.statusCode,
          duration_ms: responseTime,
          trace_id: spanContext?.traceId,
          span_id: spanContext?.spanId,
        }),
      )
    })

    next()
  }
}

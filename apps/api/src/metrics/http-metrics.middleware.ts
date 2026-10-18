import { Injectable, NestMiddleware } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { NextFunction, Request, Response } from 'express'
import { Counter, Histogram } from 'prom-client'

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total') private readonly requests: Counter<string>,
    @InjectMetric('http_request_duration_seconds') private readonly duration: Histogram<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path === '/metrics' || req.path === '/health') {
      next()
      return
    }

    const start = process.hrtime.bigint()
    // Middleware runs before guards. The response's finish event runs after
    // exception filters and streamed responses, with the actual HTTP status.
    // An interceptor misses guard rejections and records exceptions too early.
    res.once('finish', () => {
      const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched'
      const labels = { method: req.method, route, status_code: String(res.statusCode) }
      this.requests.inc(labels)
      this.duration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9)
    })
    next()
  }
}

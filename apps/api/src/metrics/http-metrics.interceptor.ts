import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { Counter, Histogram } from 'prom-client'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

// Records RED metrics (Rate, Errors, Duration) for every HTTP request, labelled
// by method, matched route template, and status code. The route template (e.g.
// /posts/:id) is used rather than the raw URL to keep label cardinality bounded;
// unmatched requests collapse to a single "unmatched" label.
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requests: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly duration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()

    const http = context.switchToHttp()
    const req = http.getRequest<{ method: string; route?: { path?: string } }>()
    const res = http.getResponse<{ statusCode: number }>()
    const route = req.route?.path ?? 'unmatched'

    // Skip infra endpoints so health probes and self-scrapes don't dominate.
    if (route === '/metrics' || route === '/health') return next.handle()

    const start = process.hrtime.bigint()
    const record = () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9
      const labels = { method: req.method, route, status_code: String(res.statusCode) }
      this.requests.inc(labels)
      this.duration.observe(labels, seconds)
    }

    return next.handle().pipe(tap({ next: record, error: record }))
  }
}

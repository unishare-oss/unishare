import { Module } from '@nestjs/common'
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus'
import { DomainMetricsService } from './domain-metrics.service'
import { HttpMetricsMiddleware } from './http-metrics.middleware'
import { TelemetryLifecycleService } from './telemetry-lifecycle.service'

@Module({
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),
    makeGaugeProvider({
      name: 'unishare_users_total',
      help: 'Total number of registered users',
    }),
    makeGaugeProvider({
      name: 'unishare_posts_total',
      help: 'Total number of posts by moderation status',
      labelNames: ['status'],
    }),
    makeGaugeProvider({
      name: 'unishare_comments_total',
      help: 'Total number of comments',
    }),
    makeGaugeProvider({
      name: 'unishare_chat_messages_total',
      help: 'Total number of chat messages',
    }),
    makeGaugeProvider({
      name: 'unishare_decks_total',
      help: 'Total number of decks by generation status',
      labelNames: ['status'],
    }),
    makeGaugeProvider({
      name: 'unishare_decks_retried_total',
      help: 'Decks that needed more than one generation attempt',
    }),
    DomainMetricsService,
    HttpMetricsMiddleware,
    TelemetryLifecycleService,
  ],
  exports: [HttpMetricsMiddleware],
})
export class MetricsModule {}

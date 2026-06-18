import { Controller, Get, Res } from '@nestjs/common'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import type { Response } from 'express'
import { register } from 'prom-client'

// Prometheus scrapes are unauthenticated and expect the raw text exposition
// format. @OptionalAuth opts the route out of the global Better Auth guard
// (like /health), and writing the body directly via a non-passthrough @Res
// bypasses the global ResponseInterceptor that would otherwise wrap it in JSON.
// PrometheusModule.register() sets this controller's route path to /metrics.
@Controller()
@OptionalAuth()
export class MetricsController {
  @Get()
  async index(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', register.contentType)
    response.send(await register.metrics())
  }
}

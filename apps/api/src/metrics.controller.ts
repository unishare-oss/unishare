import { Controller } from '@nestjs/common'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { PrometheusController } from '@willsoto/nestjs-prometheus'

@Controller()
@OptionalAuth()
export class MetricsController extends PrometheusController {}

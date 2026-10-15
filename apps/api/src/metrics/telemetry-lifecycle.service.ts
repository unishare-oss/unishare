import { Injectable, OnApplicationShutdown } from '@nestjs/common'
import { telemetry } from '../telemetry'

@Injectable()
export class TelemetryLifecycleService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await telemetry?.shutdown()
  }
}

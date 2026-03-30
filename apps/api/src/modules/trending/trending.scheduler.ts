import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { TrendingService } from './trending.service'

@Injectable()
export class TrendingScheduler implements OnModuleInit {
  private readonly logger = new Logger(TrendingScheduler.name)

  constructor(private readonly trendingService: TrendingService) {}

  async onModuleInit() {
    await this.trendingService.refreshTrendingScores()
  }

  /**
   * Refresh trending scores every 5 minutes.
   * Runs automatically when application starts.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTrendingRefresh(): Promise<void> {
    try {
      await this.trendingService.refreshTrendingScores()
    } catch (error) {
      this.logger.error('[TrendingScheduler] Failed to refresh trending scores', error)
      // Don't re-throw: scheduler should continue running
    }
  }
}

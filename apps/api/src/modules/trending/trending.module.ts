import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { TrendingService } from './trending.service'
import { TrendingScheduler } from './trending.scheduler'

@Module({
  imports: [CronLockModule],
  providers: [TrendingService, TrendingScheduler],
  exports: [TrendingService],
})
export class TrendingModule {}

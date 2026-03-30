import { Module } from '@nestjs/common'
import { TrendingService } from './trending.service'
import { TrendingScheduler } from './trending.scheduler'

@Module({
  providers: [TrendingService, TrendingScheduler],
  exports: [TrendingService],
})
export class TrendingModule {}

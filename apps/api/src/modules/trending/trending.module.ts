import { Module } from '@nestjs/common'
import { TrendingService } from './trending.service'

@Module({
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule {}

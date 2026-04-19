import { Module } from '@nestjs/common'
import { RedisThrottlerStorageService } from './redis-throttler-storage.service'

@Module({
  providers: [RedisThrottlerStorageService],
  exports: [RedisThrottlerStorageService],
})
export class RedisThrottlerStorageModule {}

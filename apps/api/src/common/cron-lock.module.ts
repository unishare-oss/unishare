import { Module } from '@nestjs/common'
import { CronLockService } from './cron-lock.service'

@Module({
  providers: [CronLockService],
  exports: [CronLockService],
})
export class CronLockModule {}

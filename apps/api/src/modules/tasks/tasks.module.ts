import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { TasksService } from './tasks.service'

@Module({
  imports: [CronLockModule],
  providers: [TasksService],
})
export class TasksModule {}

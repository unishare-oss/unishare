import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { CoursesModule } from '@/modules/courses/courses.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'
import { AiModule } from '@/modules/ai/ai.module'
import { UniversitiesModule } from '@/modules/universities/universities.module'
import { ExamsController } from './exams.controller'
import { ExamsRepository } from './exams.repository'
import { ExamsService } from './exams.service'
import { ExamReminderScheduler } from './exam-reminder.scheduler'
import { ExamImportService } from './exam-import.service'

@Module({
  imports: [CronLockModule, CoursesModule, NotificationsModule, AiModule, UniversitiesModule],
  controllers: [ExamsController],
  providers: [ExamsService, ExamsRepository, ExamImportService, ExamReminderScheduler],
  exports: [ExamsService],
})
export class ExamsModule {}

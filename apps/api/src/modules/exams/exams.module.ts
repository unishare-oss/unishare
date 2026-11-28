import { Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { CoursesModule } from '@/modules/courses/courses.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'
import { MyCoursesModule } from '@/modules/my-courses/my-courses.module'
import { ExamsController } from './exams.controller'
import { ExamsRepository } from './exams.repository'
import { ExamsService } from './exams.service'
import { ExamReminderScheduler } from './exam-reminder.scheduler'

@Module({
  imports: [CronLockModule, CoursesModule, NotificationsModule, MyCoursesModule],
  controllers: [ExamsController],
  providers: [ExamsService, ExamsRepository, ExamReminderScheduler],
  exports: [ExamsService],
})
export class ExamsModule {}

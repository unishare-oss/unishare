import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { ExamsService } from './exams.service'

export const EXAM_REMINDER_LOCK_KEY = 'exam-reminder'
/** Same TTL as chat-cleanup's daily job — comfortably over how long one day's reminder pass takes. */
export const EXAM_REMINDER_LOCK_TTL_MS = 5 * 60 * 1000

@Injectable()
export class ExamReminderScheduler {
  private readonly logger = new Logger(ExamReminderScheduler.name)

  constructor(
    private readonly examsService: ExamsService,
    private readonly cronLock: CronLockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExamReminders(): Promise<void> {
    try {
      await runWithCronLock(
        this.cronLock,
        EXAM_REMINDER_LOCK_KEY,
        EXAM_REMINDER_LOCK_TTL_MS,
        this.logger,
        () => this.examsService.sendDueReminders(),
      )
    } catch (error) {
      this.logger.error('Failed to send exam reminders', error)
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing'
import { CronLockService } from '@/common/cron-lock.service'
import {
  ExamReminderScheduler,
  EXAM_REMINDER_LOCK_KEY,
  EXAM_REMINDER_LOCK_TTL_MS,
} from './exam-reminder.scheduler'
import { ExamsService } from './exams.service'

describe('ExamReminderScheduler', () => {
  let scheduler: ExamReminderScheduler
  let examsMock: { sendDueReminders: jest.Mock }
  let cronLockMock: { acquire: jest.Mock; release: jest.Mock }

  beforeEach(async () => {
    examsMock = { sendDueReminders: jest.fn().mockResolvedValue(undefined) }
    cronLockMock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamReminderScheduler,
        { provide: ExamsService, useValue: examsMock },
        { provide: CronLockService, useValue: cronLockMock },
      ],
    }).compile()

    scheduler = module.get(ExamReminderScheduler)
  })

  it('sends reminders and releases the lock when it is acquired', async () => {
    await scheduler.handleExamReminders()

    expect(cronLockMock.acquire).toHaveBeenCalledWith(
      EXAM_REMINDER_LOCK_KEY,
      EXAM_REMINDER_LOCK_TTL_MS,
    )
    expect(examsMock.sendDueReminders).toHaveBeenCalledTimes(1)
    expect(cronLockMock.release).toHaveBeenCalledWith(EXAM_REMINDER_LOCK_KEY)
  })

  it('does NOT send reminders when another replica holds the lock', async () => {
    cronLockMock.acquire.mockResolvedValue(false)
    await scheduler.handleExamReminders()

    expect(examsMock.sendDueReminders).not.toHaveBeenCalled()
    expect(cronLockMock.release).not.toHaveBeenCalled()
  })

  it('releases the lock even when sending reminders throws', async () => {
    examsMock.sendDueReminders.mockRejectedValue(new Error('db down'))
    await scheduler.handleExamReminders()

    expect(cronLockMock.release).toHaveBeenCalledWith(EXAM_REMINDER_LOCK_KEY)
  })

  it('does not reject when sending reminders throws', async () => {
    examsMock.sendDueReminders.mockRejectedValue(new Error('db down'))
    await expect(scheduler.handleExamReminders()).resolves.toBeUndefined()
  })
})

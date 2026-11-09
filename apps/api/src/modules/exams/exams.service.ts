import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CoursesService } from '@/modules/courses/courses.service'
import { NotificationsService } from '@/modules/notifications/notifications.service'
import { computeEnrollmentYearForLevel } from '@/common/utils/academic-year'
import { UniversityScope } from '@/common/university-scope'
import { ExamsRepository } from './exams.repository'
import { CreateExamDto } from './dto/create-exam.dto'
import { UpdateExamDto } from './dto/update-exam.dto'

/** How far ahead of an exam its one reminder notification fires. */
export const EXAM_REMINDER_LEAD_DAYS = 14

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name)

  constructor(
    private readonly examsRepository: ExamsRepository,
    private readonly coursesService: CoursesService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // Another university's course is a 404, so staff can't add exams to it.
  async create(dto: CreateExamDto, createdBy: string, scope: UniversityScope) {
    await this.coursesService.findOne(dto.courseId, scope)
    this.assertValidTimeRange(dto.startsAt, dto.endsAt)
    return this.examsRepository.create(dto, createdBy)
  }

  async findInRange(
    from: string,
    to: string,
    scope: UniversityScope,
    departmentId?: string,
    courseId?: string,
  ) {
    return this.examsRepository.findInRange(
      new Date(from),
      new Date(to),
      scope,
      departmentId,
      courseId,
    )
  }

  async findOne(id: string, scope: UniversityScope) {
    const exam = await this.examsRepository.findById(id, scope)
    if (!exam) throw new NotFoundException('Exam not found')
    return exam
  }

  async update(id: string, dto: UpdateExamDto, scope: UniversityScope) {
    const existing = await this.findOne(id, scope)
    if (dto.courseId !== undefined) {
      await this.coursesService.findOne(dto.courseId, scope)
    }

    const startsAt = dto.startsAt ?? existing.startsAt.toISOString()
    const endsAt = dto.endsAt !== undefined ? dto.endsAt : (existing.endsAt?.toISOString() ?? null)
    this.assertValidTimeRange(startsAt, endsAt)

    return this.examsRepository.update(id, dto)
  }

  async remove(id: string, scope: UniversityScope) {
    await this.findOne(id, scope)
    await this.examsRepository.remove(id)
  }

  private assertValidTimeRange(startsAt: string, endsAt?: string | null): void {
    if (!endsAt) return
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new BadRequestException('End time must be after the start time')
    }
  }

  /**
   * Fires the single 14-days-out reminder for every exam whose day has just entered that
   * window, then stamps `reminderSentAt` so a re-run (crash, lock miss) never double-sends.
   */
  async sendDueReminders(now = new Date()): Promise<void> {
    const targetDate = new Date(now)
    targetDate.setUTCDate(targetDate.getUTCDate() + EXAM_REMINDER_LEAD_DAYS)

    const dueExams = await this.examsRepository.findDueForReminder(targetDate)
    if (dueExams.length === 0) return

    const academicStartMonth = this.config.get<number>('ACADEMIC_START_MONTH', 9)

    for (const exam of dueExams) {
      const { departmentId, yearLevel } = exam.course
      const enrollmentYear =
        yearLevel != null
          ? computeEnrollmentYearForLevel(yearLevel, now, academicStartMonth)
          : undefined

      const recipientIds = await this.examsRepository.findReminderRecipientIds(
        departmentId,
        enrollmentYear,
      )

      await this.notificationsService.notifyExamReminder(
        exam.id,
        exam.course.code,
        exam.title,
        exam.startsAt,
        recipientIds,
      )
      await this.examsRepository.markReminderSent(exam.id, now)

      this.logger.log(`Sent exam reminder for ${exam.id} to ${recipientIds.length} student(s)`)
    }
  }
}

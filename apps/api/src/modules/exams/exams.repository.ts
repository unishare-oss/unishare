import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { UserRole } from '@/generated/prisma/client'
import { CreateExamDto } from './dto/create-exam.dto'
import { UpdateExamDto } from './dto/update-exam.dto'

const EXAM_INCLUDE = {
  course: { include: { department: true } },
} as const

@Injectable()
export class ExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateExamDto, createdBy: string) {
    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        examRoom: dto.examRoom ?? undefined,
        notes: dto.notes ?? undefined,
        createdBy,
      },
      include: EXAM_INCLUDE,
    })
  }

  findById(id: string) {
    return this.prisma.exam.findUnique({ where: { id }, include: EXAM_INCLUDE })
  }

  findInRange(from: Date, to: Date, departmentId?: string, courseId?: string) {
    return this.prisma.exam.findMany({
      where: {
        startsAt: { gte: from, lte: to },
        ...(courseId ? { courseId } : {}),
        ...(departmentId ? { course: { departmentId } } : {}),
      },
      include: EXAM_INCLUDE,
      orderBy: { startsAt: 'asc' },
    })
  }

  update(id: string, dto: UpdateExamDto) {
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.courseId !== undefined && { courseId: dto.courseId }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.examRoom !== undefined && { examRoom: dto.examRoom }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: EXAM_INCLUDE,
    })
  }

  remove(id: string) {
    return this.prisma.exam.delete({ where: { id } })
  }

  /** Exams starting on `targetDate`'s calendar day (UTC) that haven't been reminded yet. */
  findDueForReminder(targetDate: Date) {
    const dayStart = new Date(targetDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    return this.prisma.exam.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, reminderSentAt: null },
      include: EXAM_INCLUDE,
    })
  }

  markReminderSent(id: string, sentAt: Date) {
    return this.prisma.exam.update({ where: { id }, data: { reminderSentAt: sentAt } })
  }

  /** Students in `departmentId`, optionally narrowed to a single `enrollmentYear`. */
  findReminderRecipientIds(departmentId: string, enrollmentYear?: number) {
    return this.prisma.user
      .findMany({
        where: {
          departmentId,
          role: UserRole.STUDENT,
          isAnonymous: { not: true },
          ...(enrollmentYear !== undefined ? { enrollmentYear } : {}),
        },
        select: { id: true },
      })
      .then((users) => users.map((u) => u.id))
  }
}

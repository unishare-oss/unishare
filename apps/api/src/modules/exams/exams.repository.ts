import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { courseInScope, UniversityScope } from '@/common/university-scope'
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

  bulkCreate(rows: CreateExamDto[], createdBy: string) {
    return this.prisma.exam.createManyAndReturn({
      data: rows.map((dto) => ({
        courseId: dto.courseId,
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        examRoom: dto.examRoom ?? undefined,
        notes: dto.notes ?? undefined,
        createdBy,
      })),
      include: EXAM_INCLUDE,
    })
  }

  findByCourseAndStart(pairs: { courseId: string; startsAt: Date }[]) {
    return this.prisma.exam.findMany({
      where: {
        OR: pairs.map(({ courseId, startsAt }) => ({ courseId, startsAt })),
      },
      select: { courseId: true, startsAt: true },
    })
  }

  findUpcomingForCourses(courseIds: string[], now: Date) {
    return this.prisma.exam.findMany({
      where: { courseId: { in: courseIds }, startsAt: { gte: now } },
      select: {
        id: true,
        courseId: true,
        title: true,
        startsAt: true,
        endsAt: true,
        examRoom: true,
      },
      orderBy: { startsAt: 'asc' },
    })
  }

  findById(id: string, scope: UniversityScope) {
    return this.prisma.exam.findUnique({
      where: { id, AND: [{ course: courseInScope(scope) }] },
      include: EXAM_INCLUDE,
    })
  }

  findInRange(
    from: Date,
    to: Date,
    scope: UniversityScope,
    departmentId?: string,
    courseIds?: string[],
  ) {
    return this.prisma.exam.findMany({
      where: {
        AND: [
          {
            startsAt: { gte: from, lte: to },
            ...(courseIds ? { courseId: { in: courseIds } } : {}),
            ...(departmentId ? { course: { departmentId } } : {}),
          },
          { course: courseInScope(scope) },
        ],
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

  /** Exams starting in `[now, until)` that haven't been reminded yet. */
  findDueForReminder(now: Date, until: Date) {
    return this.prisma.exam.findMany({
      where: { startsAt: { gte: now, lt: until }, reminderSentAt: null },
      include: EXAM_INCLUDE,
    })
  }

  markReminderSent(id: string, sentAt: Date) {
    return this.prisma.exam.update({ where: { id }, data: { reminderSentAt: sentAt } })
  }
}

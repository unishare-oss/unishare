import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { StudentCourseChangeKind } from '@/generated/prisma/client'

const courseSelect = {
  id: true,
  code: true,
  name: true,
  yearLevel: true,
} as const

@Injectable()
export class MyCoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStudent(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, enrollmentYear: true },
    })
  }

  findAutomatic(departmentId: string, yearLevel: number) {
    return this.prisma.course.findMany({
      where: { departmentId, yearLevel },
      select: courseSelect,
      orderBy: { code: 'asc' },
    })
  }

  findDepartmentCourses(departmentId: string, courseIds: string[]) {
    return this.prisma.course.findMany({
      where: { departmentId, id: { in: courseIds } },
      select: courseSelect,
    })
  }

  replaceChangesAndConfirm(
    userId: string,
    academicYear: number,
    changes: { courseId: string; kind: StudentCourseChangeKind }[],
    confirmedAt: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.studentCourseChange.deleteMany({ where: { userId, academicYear } })
      if (changes.length > 0) {
        await tx.studentCourseChange.createMany({
          data: changes.map((change) => ({ userId, academicYear, ...change })),
        })
      }
      await tx.studentCourseCheck.upsert({
        where: { userId_academicYear: { userId, academicYear } },
        create: { userId, academicYear, confirmedAt },
        update: { confirmedAt },
      })
    })
  }

  async findChanges(userId: string, academicYear: number) {
    const [changes, check] = await Promise.all([
      this.prisma.studentCourseChange.findMany({
        where: { userId, academicYear },
        select: { kind: true, course: { select: { ...courseSelect, departmentId: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.studentCourseCheck.findUnique({
        where: { userId_academicYear: { userId, academicYear } },
        select: { confirmedAt: true },
      }),
    ])
    return {
      changes: changes.map(({ kind, course }) => ({
        kind,
        departmentId: course.departmentId,
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          yearLevel: course.yearLevel,
        },
      })),
      confirmedAt: check?.confirmedAt ?? null,
    }
  }
}

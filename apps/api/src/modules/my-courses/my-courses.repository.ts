import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

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

  async findChanges(userId: string, academicYear: number) {
    const [changes, check] = await Promise.all([
      this.prisma.studentCourseChange.findMany({
        where: { userId, academicYear },
        select: { kind: true, course: { select: courseSelect } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.studentCourseCheck.findUnique({
        where: { userId_academicYear: { userId, academicYear } },
        select: { confirmedAt: true },
      }),
    ])
    return { changes, confirmedAt: check?.confirmedAt ?? null }
  }
}

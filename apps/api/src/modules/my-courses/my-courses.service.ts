import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StudentCourseChangeKind } from '@/generated/prisma/client'
import { computeYearLevel, currentAcademicYear } from '@/common/utils/academic-year'
import { MyCoursesRepository } from './my-courses.repository'
import { MyCoursesEntity } from './entities/my-courses.entity'

@Injectable()
export class MyCoursesService {
  constructor(
    private readonly repository: MyCoursesRepository,
    private readonly config: ConfigService,
  ) {}

  /** Automatic courses (own department, current year level), minus removals, plus additions. */
  async getForStudent(userId: string, now = new Date()): Promise<MyCoursesEntity> {
    const student = await this.repository.findStudent(userId)
    if (!student?.departmentId || student.enrollmentYear === null) {
      return { automatic: [], removed: [], added: [], final: [], confirmed: false }
    }

    const startMonth = this.config.get<number>('ACADEMIC_START_MONTH', 9)
    const academicYear = currentAcademicYear(now, startMonth)
    const yearLevel = computeYearLevel(student.enrollmentYear, now, startMonth)

    const [automatic, { changes, confirmedAt }] = await Promise.all([
      this.repository.findAutomatic(student.departmentId, yearLevel),
      this.repository.findChanges(userId, academicYear),
    ])

    const automaticIds = new Set(automatic.map((course) => course.id))
    const removed = changes
      .filter(
        (change) =>
          change.kind === StudentCourseChangeKind.REMOVED && automaticIds.has(change.course.id),
      )
      .map((change) => change.course)
    const added = changes
      .filter(
        (change) =>
          change.kind === StudentCourseChangeKind.ADDED && !automaticIds.has(change.course.id),
      )
      .map((change) => change.course)
    const removedIds = new Set(removed.map((course) => course.id))
    const final = [...automatic.filter((course) => !removedIds.has(course.id)), ...added]

    return { automatic, removed, added, final, confirmed: confirmedAt !== null }
  }
}

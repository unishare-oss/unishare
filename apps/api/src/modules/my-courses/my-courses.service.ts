import { BadRequestException, Injectable } from '@nestjs/common'
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
    const { academicYear, departmentId, yearLevel } = await this.studentYear(userId, now)
    if (!departmentId || yearLevel === null) {
      return { academicYear, automatic: [], removed: [], added: [], final: [], confirmed: false }
    }

    const [automatic, { changes, confirmedAt }] = await Promise.all([
      this.repository.findAutomatic(departmentId, yearLevel),
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
          change.kind === StudentCourseChangeKind.ADDED &&
          change.departmentId === departmentId &&
          !automaticIds.has(change.course.id),
      )
      .map((change) => change.course)
    const removedIds = new Set(removed.map((course) => course.id))
    const final = [...automatic.filter((course) => !removedIds.has(course.id)), ...added]

    return { academicYear, automatic, removed, added, final, confirmed: confirmedAt !== null }
  }

  async save(userId: string, courseIds: string[], now = new Date()): Promise<MyCoursesEntity> {
    const { academicYear, departmentId, yearLevel } = await this.studentYear(userId, now)
    if (!departmentId || yearLevel === null) {
      throw new BadRequestException(
        'Set your department and enrollment year before saving courses.',
      )
    }

    const uniqueIds = [...new Set(courseIds)]
    const [automatic, selected] = await Promise.all([
      this.repository.findAutomatic(departmentId, yearLevel),
      this.repository.findDepartmentCourses(departmentId, uniqueIds),
    ])
    if (selected.length !== uniqueIds.length) {
      throw new BadRequestException('Each course must be in your department.')
    }

    const automaticIds = new Set(automatic.map((course) => course.id))
    const selectedIds = new Set(uniqueIds)
    const changes = [
      ...automatic
        .filter((course) => !selectedIds.has(course.id))
        .map((course) => ({ courseId: course.id, kind: StudentCourseChangeKind.REMOVED })),
      ...selected
        .filter((course) => !automaticIds.has(course.id))
        .map((course) => ({ courseId: course.id, kind: StudentCourseChangeKind.ADDED })),
    ]
    await this.repository.replaceChangesAndConfirm(userId, academicYear, changes, now)
    return this.getForStudent(userId, now)
  }

  private async studentYear(userId: string, now: Date) {
    const student = await this.repository.findStudent(userId)
    const startMonth = this.config.get<number>('ACADEMIC_START_MONTH', 9)
    const academicYear = currentAcademicYear(now, startMonth)
    if (!student?.departmentId || student.enrollmentYear === null) {
      return { academicYear, departmentId: null, yearLevel: null }
    }
    return {
      academicYear,
      departmentId: student.departmentId,
      yearLevel: computeYearLevel(student.enrollmentYear, now, startMonth),
    }
  }
}

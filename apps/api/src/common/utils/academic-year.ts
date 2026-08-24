/**
 * Academic years don't align with calendar years — a student who enrolled in `enrollmentYear`
 * is in their Nth year once `ACADEMIC_START_MONTH` has passed in year `enrollmentYear + N - 1`.
 */
export function currentAcademicYear(now: Date, academicStartMonth: number): number {
  return now.getMonth() + 1 >= academicStartMonth ? now.getFullYear() : now.getFullYear() - 1
}

export function computeYearLevel(
  enrollmentYear: number,
  now: Date,
  academicStartMonth: number,
): number {
  return Math.max(1, currentAcademicYear(now, academicStartMonth) - enrollmentYear + 1)
}

/** Inverse of computeYearLevel — the enrollmentYear a student in `yearLevel` right now must have. */
export function computeEnrollmentYearForLevel(
  yearLevel: number,
  now: Date,
  academicStartMonth: number,
): number {
  return currentAcademicYear(now, academicStartMonth) - yearLevel + 1
}

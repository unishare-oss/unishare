import {
  computeYearLevel,
  computeEnrollmentYearForLevel,
  currentAcademicYear,
} from './academic-year'

describe('academic-year', () => {
  describe('currentAcademicYear', () => {
    it('returns the calendar year once the academic start month has passed', () => {
      expect(currentAcademicYear(new Date('2026-09-15'), 9)).toBe(2026)
    })

    it('returns the previous calendar year before the academic start month', () => {
      expect(currentAcademicYear(new Date('2026-03-15'), 9)).toBe(2025)
    })
  })

  describe('computeYearLevel', () => {
    it('computes a first-year student correctly', () => {
      expect(computeYearLevel(2026, new Date('2026-09-15'), 9)).toBe(1)
    })

    it('computes a later-year student correctly', () => {
      expect(computeYearLevel(2023, new Date('2026-09-15'), 9)).toBe(4)
    })

    it('floors at year 1 for a future enrollmentYear', () => {
      expect(computeYearLevel(2030, new Date('2026-09-15'), 9)).toBe(1)
    })
  })

  describe('computeEnrollmentYearForLevel', () => {
    it('is the inverse of computeYearLevel', () => {
      const now = new Date('2026-09-15')
      const enrollmentYear = 2023
      const yearLevel = computeYearLevel(enrollmentYear, now, 9)
      expect(computeEnrollmentYearForLevel(yearLevel, now, 9)).toBe(enrollmentYear)
    })
  })
})

import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'
import { MyCoursesService } from './my-courses.service'
import { MyCoursesRepository } from './my-courses.repository'

const course = (id: string, yearLevel: number | null = 2) => ({
  id,
  code: id.toUpperCase(),
  name: `Course ${id}`,
  yearLevel,
})

// 2026-10-15 with start month 9 -> academic year 2026; enrolled 2025 -> year level 2.
const NOW = new Date('2026-10-15T12:00:00Z')

describe('MyCoursesService.getForStudent', () => {
  let repo: {
    findStudent: jest.Mock
    findAutomatic: jest.Mock
    findChanges: jest.Mock
  }
  let service: MyCoursesService

  beforeEach(() => {
    repo = {
      findStudent: jest.fn().mockResolvedValue({ departmentId: 'd1', enrollmentYear: 2025 }),
      findAutomatic: jest.fn().mockResolvedValue([course('a'), course('b')]),
      findChanges: jest.fn().mockResolvedValue({ changes: [], confirmedAt: null }),
    }
    const config = { get: (_k: string, d: number) => d } as unknown as ConfigService
    service = new MyCoursesService(repo as unknown as MyCoursesRepository, config)
  })

  it('uses the department courses of the current year level as the automatic list', async () => {
    const result = await service.getForStudent('u1', NOW)
    expect(repo.findAutomatic).toHaveBeenCalledWith('d1', 2)
    expect(repo.findChanges).toHaveBeenCalledWith('u1', 2026)
    expect(result.automatic.map((c) => c.id)).toEqual(['a', 'b'])
    expect(result.final.map((c) => c.id)).toEqual(['a', 'b'])
    expect(result.academicYear).toBe(2026)
    expect(result.confirmed).toBe(false)
  })

  it('applies removals and additions', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [
        { kind: 'REMOVED', course: course('a') },
        { kind: 'ADDED', departmentId: 'd1', course: course('x', null) },
      ],
      confirmedAt: new Date(),
    })
    const result = await service.getForStudent('u1', NOW)
    expect(result.removed.map((c) => c.id)).toEqual(['a'])
    expect(result.added.map((c) => c.id)).toEqual(['x'])
    expect(result.final.map((c) => c.id)).toEqual(['b', 'x'])
    expect(result.confirmed).toBe(true)
  })

  it('only queries the current academic year, so other-year changes are ignored', async () => {
    await service.getForStudent('u1', new Date('2027-01-10T12:00:00Z'))
    expect(repo.findChanges).toHaveBeenCalledWith('u1', 2026)
    await service.getForStudent('u1', new Date('2027-10-10T12:00:00Z'))
    expect(repo.findChanges).toHaveBeenLastCalledWith('u1', 2027)
  })

  it('returns the server academic year even when the year level is clamped', async () => {
    repo.findStudent.mockResolvedValue({ departmentId: 'd1', enrollmentYear: 2028 })
    const result = await service.getForStudent('u1', NOW)
    expect(repo.findAutomatic).toHaveBeenCalledWith('d1', 1)
    expect(result.academicYear).toBe(2026)
  })

  it('ignores a removal of a course that is no longer automatic', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [{ kind: 'REMOVED', course: course('gone') }],
      confirmedAt: null,
    })
    const result = await service.getForStudent('u1', NOW)
    expect(result.removed).toEqual([])
    expect(result.final.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('counts an addition of an automatic course once', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [{ kind: 'ADDED', departmentId: 'd1', course: course('a') }],
      confirmedAt: null,
    })
    const result = await service.getForStudent('u1', NOW)
    expect(result.final.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('ignores an added course that moved to another department', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [{ kind: 'ADDED', departmentId: 'd2', course: course('old', 1) }],
      confirmedAt: NOW,
    })

    const result = await service.getForStudent('u1', NOW)

    expect(result.added).toEqual([])
    expect(result.final.map((item) => item.id)).toEqual(['a', 'b'])
    expect(result.confirmed).toBe(true)
  })

  it('returns empty lists when the year has no courses', async () => {
    repo.findAutomatic.mockResolvedValue([])
    const result = await service.getForStudent('u1', NOW)
    expect(result.final).toEqual([])
  })

  it('returns empty lists without a department or enrollment year', async () => {
    repo.findStudent.mockResolvedValue({ departmentId: null, enrollmentYear: 2025 })
    const result = await service.getForStudent('u1', NOW)
    expect(result).toEqual({
      academicYear: 2026,
      automatic: [],
      removed: [],
      added: [],
      final: [],
      confirmed: false,
    })
    expect(repo.findAutomatic).not.toHaveBeenCalled()
  })
})

describe('MyCoursesService.save', () => {
  let repo: {
    findStudent: jest.Mock
    findAutomatic: jest.Mock
    findChanges: jest.Mock
    findDepartmentCourses: jest.Mock
    replaceChangesAndConfirm: jest.Mock
  }
  let service: MyCoursesService

  beforeEach(() => {
    repo = {
      findStudent: jest.fn().mockResolvedValue({ departmentId: 'd1', enrollmentYear: 2025 }),
      findAutomatic: jest.fn().mockResolvedValue([course('a'), course('b')]),
      findChanges: jest.fn().mockResolvedValue({ changes: [], confirmedAt: new Date() }),
      findDepartmentCourses: jest
        .fn()
        .mockImplementation((_departmentId: string, ids: string[]) =>
          Promise.resolve(ids.map((id) => course(id))),
        ),
      replaceChangesAndConfirm: jest.fn().mockResolvedValue(undefined),
    }
    const config = { get: (_k: string, d: number) => d } as unknown as ConfigService
    service = new MyCoursesService(repo as unknown as MyCoursesRepository, config)
  })

  it('removes an automatic course from this academic year and confirms the list', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [{ kind: 'REMOVED', course: course('a') }],
      confirmedAt: NOW,
    })

    const result = await service.save('u1', ['b'], NOW)

    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith(
      'u1',
      2026,
      [{ courseId: 'a', kind: 'REMOVED' }],
      NOW,
    )
    expect(result.final.map((item) => item.id)).toEqual(['b'])
    expect(result.academicYear).toBe(2026)
    expect(result.confirmed).toBe(true)
  })

  it('adds an own-department course from another year', async () => {
    repo.findDepartmentCourses.mockResolvedValue([course('a'), course('b'), course('x', 3)])
    repo.findChanges.mockResolvedValue({
      changes: [{ kind: 'ADDED', departmentId: 'd1', course: course('x', 3) }],
      confirmedAt: NOW,
    })

    const result = await service.save('u1', ['a', 'b', 'x'], NOW)

    expect(repo.findDepartmentCourses).toHaveBeenCalledWith('d1', ['a', 'b', 'x'])
    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith(
      'u1',
      2026,
      [{ courseId: 'x', kind: 'ADDED' }],
      NOW,
    )
    expect(result.final.map((item) => item.id)).toEqual(['a', 'b', 'x'])
  })

  it('re-adds an automatic course by clearing its old removal', async () => {
    repo.findChanges.mockResolvedValue({ changes: [], confirmedAt: NOW })

    const result = await service.save('u1', ['a', 'b'], NOW)

    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith('u1', 2026, [], NOW)
    expect(result.final.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('deduplicates selected course ids', async () => {
    await service.save('u1', ['a', 'a', 'b'], NOW)

    expect(repo.findDepartmentCourses).toHaveBeenCalledWith('d1', ['a', 'b'])
    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith('u1', 2026, [], NOW)
  })

  it('allows an empty list', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [
        { kind: 'REMOVED', course: course('a') },
        { kind: 'REMOVED', course: course('b') },
      ],
      confirmedAt: NOW,
    })

    const result = await service.save('u1', [], NOW)

    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith(
      'u1',
      2026,
      [
        { courseId: 'a', kind: 'REMOVED' },
        { courseId: 'b', kind: 'REMOVED' },
      ],
      NOW,
    )
    expect(result.final).toEqual([])
  })

  it('confirms an unchanged list without changes', async () => {
    const result = await service.save('u1', ['a', 'b'], NOW)

    expect(repo.replaceChangesAndConfirm).toHaveBeenCalledWith('u1', 2026, [], NOW)
    expect(result.confirmed).toBe(true)
  })

  it('rejects a course outside the department without writing', async () => {
    repo.findDepartmentCourses.mockResolvedValue([course('a')])

    await expect(service.save('u1', ['a', 'other'], NOW)).rejects.toThrow(
      new BadRequestException('Each course must be in your department.'),
    )
    expect(repo.replaceChangesAndConfirm).not.toHaveBeenCalled()
  })

  it('rejects an unknown course without writing', async () => {
    repo.findDepartmentCourses.mockResolvedValue([])

    await expect(service.save('u1', ['unknown'], NOW)).rejects.toThrow(
      new BadRequestException('Each course must be in your department.'),
    )
    expect(repo.replaceChangesAndConfirm).not.toHaveBeenCalled()
  })

  it('rejects a student without a department', async () => {
    repo.findStudent.mockResolvedValue({ departmentId: null, enrollmentYear: 2025 })

    await expect(service.save('u1', ['a'], NOW)).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.replaceChangesAndConfirm).not.toHaveBeenCalled()
  })

  it('rejects a student without an enrollment year', async () => {
    repo.findStudent.mockResolvedValue({ departmentId: 'd1', enrollmentYear: null })

    await expect(service.save('u1', ['a'], NOW)).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.replaceChangesAndConfirm).not.toHaveBeenCalled()
  })
})

describe('MyCoursesService.findStudentIdsTaking', () => {
  const repo = { findStudentIdsTaking: jest.fn() }
  const config = { get: (_key: string, fallback: number) => fallback } as unknown as ConfigService
  const service = new MyCoursesService(repo as unknown as MyCoursesRepository, config)

  beforeEach(() => repo.findStudentIdsTaking.mockReset())

  it('uses this academic year and the automatic enrollment year for a leveled course', async () => {
    repo.findStudentIdsTaking.mockResolvedValue(['automatic', 'added'])
    const course = { id: 'c1', departmentId: 'd1', yearLevel: 2 }

    await expect(service.findStudentIdsTaking(course, NOW)).resolves.toEqual(['automatic', 'added'])
    expect(repo.findStudentIdsTaking).toHaveBeenCalledWith(course, 2026, 2025)
  })

  it('also matches future enrollment years for a year-one course', async () => {
    repo.findStudentIdsTaking.mockResolvedValue([])
    const course = { id: 'c1', departmentId: 'd1', yearLevel: 1 }

    await service.findStudentIdsTaking(course, NOW)
    expect(repo.findStudentIdsTaking).toHaveBeenCalledWith(course, 2026, { gte: 2026 })
  })

  it('has no automatic enrollment year for a course without a year level', async () => {
    repo.findStudentIdsTaking.mockResolvedValue(['added'])
    const course = { id: 'c1', departmentId: 'd1', yearLevel: null }

    await expect(service.findStudentIdsTaking(course, NOW)).resolves.toEqual(['added'])
    expect(repo.findStudentIdsTaking).toHaveBeenCalledWith(course, 2026, undefined)
  })
})

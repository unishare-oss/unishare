import { ConfigService } from '@nestjs/config'
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
    expect(result.confirmed).toBe(false)
  })

  it('applies removals and additions', async () => {
    repo.findChanges.mockResolvedValue({
      changes: [
        { kind: 'REMOVED', course: course('a') },
        { kind: 'ADDED', course: course('x', null) },
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
      changes: [{ kind: 'ADDED', course: course('a') }],
      confirmedAt: null,
    })
    const result = await service.getForStudent('u1', NOW)
    expect(result.final.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('returns empty lists when the year has no courses', async () => {
    repo.findAutomatic.mockResolvedValue([])
    const result = await service.getForStudent('u1', NOW)
    expect(result.final).toEqual([])
  })

  it('returns empty lists without a department or enrollment year', async () => {
    repo.findStudent.mockResolvedValue({ departmentId: null, enrollmentYear: 2025 })
    const result = await service.getForStudent('u1', NOW)
    expect(result).toEqual({ automatic: [], removed: [], added: [], final: [], confirmed: false })
    expect(repo.findAutomatic).not.toHaveBeenCalled()
  })
})

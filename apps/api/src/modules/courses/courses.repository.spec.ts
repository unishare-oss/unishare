import { UniversityScope } from '@/common/university-scope'
import { CoursesRepository } from './courses.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const IN_U1 = { department: { faculty: { universityId: 'u1' } } }

describe('CoursesRepository university scope', () => {
  let prisma: { course: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock } }
  let repository: CoursesRepository

  beforeEach(() => {
    prisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }
    repository = new CoursesRepository(prisma as any)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  it('findAll combines the filters and the scope in AND, for the page and the count', async () => {
    await repository.findAll({}, U1, 'd1', true)
    const expected = { AND: [{ departmentId: 'd1', moduleOutlines: { some: {} } }, IN_U1] }
    expect(whereOf(prisma.course.findMany)).toEqual(expected)
    expect(whereOf(prisma.course.count)).toEqual(expected)
  })

  it('findAll matches nothing for a member with no university', async () => {
    await repository.findAll({}, { kind: 'none' })
    expect(whereOf(prisma.course.findMany)).toEqual({ AND: [{}, { id: { in: [] } }] })
  })

  it('findAll filters nothing for an admin', async () => {
    await repository.findAll({}, { kind: 'all' })
    expect(whereOf(prisma.course.findMany)).toEqual({ AND: [{}, {}] })
  })

  it('findById adds the scope to the id lookup', async () => {
    await expect(repository.findById('c1', U1)).resolves.toBeNull()
    expect(whereOf(prisma.course.findUnique)).toEqual({ id: 'c1', AND: [IN_U1] })
  })
})

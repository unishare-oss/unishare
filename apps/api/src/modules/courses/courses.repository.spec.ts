import { UniversityScope } from '@/common/university-scope'
import { PrismaService } from '@/prisma/prisma.service'
import { CoursesRepository } from './courses.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const IN_U1 = { department: { faculty: { universityId: 'u1' } } }

describe('CoursesRepository university scope', () => {
  let prisma: {
    course: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock }
    department: { findFirst: jest.Mock }
  }
  let repository: CoursesRepository

  beforeEach(() => {
    prisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      department: { findFirst: jest.fn().mockResolvedValue({ id: 'd1' }) },
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

  it('findAllInScope returns selected course fields from the requested university', async () => {
    const scopedCourses = [
      { id: 'c1', code: 'CSC219', name: 'Data Structures' },
      { id: 'c2', code: 'MTH101', name: 'Calculus' },
    ]
    prisma.course.findMany.mockResolvedValue(scopedCourses)

    await expect(repository.findAllInScope(U1)).resolves.toEqual(scopedCourses)

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: IN_U1,
      select: { id: true, code: true, name: true },
    })
  })

  it('loads suggestions only from the requested department inside the university scope', async () => {
    await repository.findSuggestionCandidates('d1', U1)
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ departmentId: 'd1' }, IN_U1] },
        select: { id: true, code: true, name: true },
      }),
    )
  })

  it('checks the selected department through its faculty university', async () => {
    await repository.findDepartmentInScope('d1', U1)
    expect(prisma.department.findFirst).toHaveBeenCalledWith({
      where: { id: 'd1', faculty: { universityId: 'u1' } },
    })
  })
})

describe('CoursesRepository.findNearestCourses', () => {
  it('queries top matching approved published chunks and returns at most three courses', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ courseId: 'c2' }])
    const repository = new CoursesRepository({ $queryRaw: queryRaw } as unknown as PrismaService)

    await expect(repository.findNearestCourses([0.1, 0.2], ['c1', 'c2'], 0.6)).resolves.toEqual([
      'c2',
    ])

    expect(queryRaw).toHaveBeenCalledTimes(1)
    const [query, ...parameters] = queryRaw.mock.calls[0]
    const sql = query.join('?')
    const candidateFilter = parameters.find(
      (parameter): parameter is { strings: string[]; values: string[] } =>
        typeof parameter === 'object' && parameter !== null && 'strings' in parameter,
    )
    expect(sql).toContain('"courseId" IN')
    expect(sql).toContain('WITH eligible_chunks AS MATERIALIZED')
    expect(sql).toContain("p.status = 'APPROVED'")
    expect(sql).toContain('p."publicationStatus" = \'PUBLISHED\'')
    expect(sql).toContain('p."deletedAt" IS NULL')
    expect(sql).toContain('embedding IS NOT NULL')
    expect(sql).toContain('ORDER BY embedding <=> ?::vector')
    expect(sql.indexOf('p."courseId" IN')).toBeLessThan(sql.indexOf('ORDER BY embedding <=>'))
    expect(sql).toContain('LIMIT ?')
    expect(sql).toContain('similarity >= ?')
    expect(sql).toContain('ORDER BY hits DESC, "bestSimilarity" DESC')
    expect(sql.trim().endsWith('LIMIT ?')).toBe(true)
    expect(parameters).toContain('[0.1,0.2]')
    expect(candidateFilter?.values).toEqual(['c1', 'c2'])
    expect(parameters).toContain(50)
    expect(parameters).toContain(0.6)
    expect(parameters).toContain(3)
  })
})

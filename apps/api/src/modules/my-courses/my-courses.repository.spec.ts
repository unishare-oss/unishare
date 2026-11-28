import { MyCoursesRepository } from './my-courses.repository'
import { PrismaService } from '@/prisma/prisma.service'

describe('MyCoursesRepository.findStudentIdsTaking', () => {
  const findMany = jest.fn()
  const repository = new MyCoursesRepository({
    user: { findMany },
  } as unknown as PrismaService)

  beforeEach(() => findMany.mockReset())

  it('selects only eligible students in the course department, including additions and excluding removals', async () => {
    findMany.mockResolvedValue([{ id: 'automatic' }, { id: 'added' }])
    const course = { id: 'c1', departmentId: 'd1', yearLevel: 2 }

    await expect(repository.findStudentIdsTaking(course, 2026, 2025)).resolves.toEqual([
      'automatic',
      'added',
    ])
    expect(findMany).toHaveBeenCalledWith({
      where: {
        departmentId: 'd1',
        role: 'STUDENT',
        isAnonymous: { not: true },
        enrollmentYear: { not: null },
        OR: [
          {
            enrollmentYear: 2025,
            courseChanges: {
              none: { courseId: 'c1', academicYear: 2026, kind: 'REMOVED' },
            },
          },
          {
            courseChanges: {
              some: { courseId: 'c1', academicYear: 2026, kind: 'ADDED' },
            },
          },
        ],
      },
      select: { id: true },
    })
  })

  it('uses additions only when a course has no automatic year level', async () => {
    findMany.mockResolvedValue([])
    const course = { id: 'c2', departmentId: 'd1', yearLevel: null }

    await expect(repository.findStudentIdsTaking(course, 2026, undefined)).resolves.toEqual([])
    expect(findMany.mock.calls[0][0].where.OR).toEqual([
      { courseChanges: { some: { courseId: 'c2', academicYear: 2026, kind: 'ADDED' } } },
    ])
  })

  it('passes a range enrollment year filter through unchanged', async () => {
    findMany.mockResolvedValue([])
    const course = { id: 'c3', departmentId: 'd1' }

    await repository.findStudentIdsTaking(course, 2026, { gte: 2026 })

    expect(findMany.mock.calls[0][0].where.OR[0].enrollmentYear).toEqual({ gte: 2026 })
  })
})

describe('MyCoursesRepository.replaceChangesAndConfirm', () => {
  it('locks the student row before replacing changes', async () => {
    const calls: string[] = []
    const tx = {
      studentCourseChange: {
        deleteMany: jest.fn(async () => calls.push('delete')),
        createMany: jest.fn(async () => calls.push('create')),
      },
      studentCourseCheck: {
        upsert: jest.fn(async () => calls.push('upsert')),
      },
      $queryRaw: jest.fn(async () => calls.push('lock')),
    }
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) }
    const repository = new MyCoursesRepository(prisma as unknown as PrismaService)

    await repository.replaceChangesAndConfirm('u1', 2026, [], new Date())

    expect(calls).toEqual(['lock', 'delete', 'upsert'])
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
  })
})

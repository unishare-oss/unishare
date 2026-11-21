import { UniversityScope } from '@/common/university-scope'
import { ExamsRepository } from './exams.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const COURSE_IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('ExamsRepository university scope', () => {
  let prisma: { exam: { findMany: jest.Mock; findUnique: jest.Mock } }
  let repository: ExamsRepository

  beforeEach(() => {
    prisma = {
      exam: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }
    repository = new ExamsRepository(prisma as any)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  it('findInRange combines the range, the department and the scope in AND', async () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-31')
    await repository.findInRange(from, to, U1, 'd1')
    expect(whereOf(prisma.exam.findMany)).toEqual({
      AND: [{ startsAt: { gte: from, lte: to }, course: { departmentId: 'd1' } }, COURSE_IN_U1],
    })
  })

  it('findInRange matches nothing for a member with no university', async () => {
    await repository.findInRange(new Date(), new Date(), { kind: 'none' })
    expect(whereOf(prisma.exam.findMany).AND[1]).toEqual({ course: { id: { in: [] } } })
  })

  it('findById adds the scope to the id lookup', async () => {
    await expect(repository.findById('e1', U1)).resolves.toBeNull()
    expect(whereOf(prisma.exam.findUnique)).toEqual({ id: 'e1', AND: [COURSE_IN_U1] })
  })
})

describe('ExamsRepository.findDueForReminder', () => {
  it('selects unreminded exams starting from now up to but not including until', async () => {
    const prisma = { exam: { findMany: jest.fn().mockResolvedValue([]) } }
    const repository = new ExamsRepository(prisma as any)
    const now = new Date('2026-11-19T03:00:00.000Z')
    const until = new Date('2026-12-03T03:00:00.000Z')

    await repository.findDueForReminder(now, until)

    expect(prisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startsAt: { gte: now, lt: until }, reminderSentAt: null },
      }),
    )
  })
})

describe('ExamsRepository.bulkCreate', () => {
  it('writes the supplied rows directly with course details', async () => {
    const created = [{ id: 'e1' }]
    const createManyAndReturn = jest.fn().mockResolvedValue(created)
    const findMany = jest.fn()
    const transaction = jest.fn()
    const repository = new ExamsRepository({
      exam: { createManyAndReturn, findMany },
      $transaction: transaction,
    } as any)
    const rows = [
      {
        courseId: 'c1',
        title: 'Final exam',
        startsAt: '2026-12-01T02:00:00.000Z',
        endsAt: '2026-12-01T05:00:00.000Z',
        examRoom: 'A-101',
      },
    ]

    await expect(repository.bulkCreate(rows, 'moderator-1')).resolves.toBe(created)

    expect(createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          ...rows[0],
          startsAt: new Date(rows[0].startsAt),
          endsAt: new Date(rows[0].endsAt),
          notes: undefined,
          createdBy: 'moderator-1',
        },
      ],
      include: { course: { include: { department: true } } },
    })
    expect(transaction).not.toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
  })

  it('queries the supplied course and start pairs without filtering', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const repository = new ExamsRepository({ exam: { findMany } } as any)
    const pairs = [
      { courseId: 'c1', startsAt: new Date('2026-12-01T02:00:00.000Z') },
      { courseId: 'c2', startsAt: new Date('2026-12-02T02:00:00.000Z') },
    ]

    await repository.findByCourseAndStart(pairs)

    expect(findMany).toHaveBeenCalledWith({
      where: { OR: pairs },
      select: { courseId: true, startsAt: true },
    })
  })

  it('returns upcoming exams only for requested courses', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const repository = new ExamsRepository({ exam: { findMany } } as any)
    const now = new Date('2026-11-21T00:00:00.000Z')

    await repository.findUpcomingForCourses(['c1', 'c2'], now)

    expect(findMany).toHaveBeenCalledWith({
      where: { courseId: { in: ['c1', 'c2'] }, startsAt: { gte: now } },
      select: {
        id: true,
        courseId: true,
        title: true,
        startsAt: true,
        endsAt: true,
        examRoom: true,
      },
      orderBy: { startsAt: 'asc' },
    })
  })
})

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

import { UniversityScope } from '@/common/university-scope'
import { PostRequestsRepository } from './post-requests.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const COURSE_IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('PostRequestsRepository university scope', () => {
  let prisma: {
    postRequest: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock }
  }
  let repository: PostRequestsRepository

  beforeEach(() => {
    prisma = {
      postRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }
    repository = new PostRequestsRepository(prisma as any)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  it('findAll combines the filters and the scope in AND, for the page and the count', async () => {
    const filters = { status: 'OPEN' as const, course: { departmentId: 'd1' } }
    await repository.findAll(filters, U1, {})
    const expected = { AND: [filters, COURSE_IN_U1] }
    expect(whereOf(prisma.postRequest.findMany)).toEqual(expected)
    expect(whereOf(prisma.postRequest.count)).toEqual(expected)
  })

  it('findAll matches nothing for a member with no university', async () => {
    await repository.findAll({}, { kind: 'none' }, {})
    expect(whereOf(prisma.postRequest.findMany)).toEqual({
      AND: [{}, { course: { id: { in: [] } } }],
    })
  })

  it('findById adds the scope to the id lookup', async () => {
    await expect(repository.findById('r1', U1)).resolves.toBeNull()
    expect(whereOf(prisma.postRequest.findUnique)).toEqual({ id: 'r1', AND: [COURSE_IN_U1] })
  })
})

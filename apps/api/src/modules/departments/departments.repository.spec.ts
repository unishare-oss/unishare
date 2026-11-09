import { DepartmentsRepository } from './departments.repository'
import { PrismaService } from '@/prisma/prisma.service'

describe('DepartmentsRepository', () => {
  let findMany: jest.Mock
  let repo: DepartmentsRepository

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([])
    repo = new DepartmentsRepository({ department: { findMany } } as unknown as PrismaService)
  })

  it("filters on the faculty's university and includes the faculty", async () => {
    await repo.findAll('u1')

    const args = findMany.mock.calls[0][0]
    expect(args.where).toEqual({ faculty: { universityId: 'u1' } })
    expect(args.include.faculty).toEqual({ select: { id: true, name: true, universityId: true } })
  })

  it('does not filter without a university', async () => {
    await repo.findAll()
    expect(findMany.mock.calls[0][0].where).toBeUndefined()
  })
})

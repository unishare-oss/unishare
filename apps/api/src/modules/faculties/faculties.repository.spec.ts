import { FacultiesRepository } from './faculties.repository'
import { PrismaService } from '@/prisma/prisma.service'

describe('FacultiesRepository', () => {
  it('filters faculties by university in the query', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const repo = new FacultiesRepository({ faculty: { findMany } } as unknown as PrismaService)

    await repo.findAll('u1')

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { universityId: 'u1' } }),
    )
  })
})

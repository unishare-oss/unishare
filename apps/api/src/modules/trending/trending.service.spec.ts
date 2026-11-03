import { TrendingService } from './trending.service'

describe('TrendingService.getTrendingPosts', () => {
  it('combines the published filter and the university scope in AND, for the page and the count', async () => {
    const prisma = {
      post: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    }
    const service = new TrendingService(prisma as any)

    await service.getTrendingPosts({ kind: 'university', universityId: 'u1' }, 20, 1)

    const expected = {
      AND: [
        { publicationStatus: 'PUBLISHED', deletedAt: null },
        { course: { department: { faculty: { universityId: 'u1' } } } },
      ],
    }
    expect(prisma.post.findMany.mock.calls[0][0].where).toEqual(expected)
    expect(prisma.post.count.mock.calls[0][0].where).toEqual(expected)
  })
})

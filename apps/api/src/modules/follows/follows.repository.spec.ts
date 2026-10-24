import { FollowsRepository } from './follows.repository'

describe('FollowsRepository', () => {
  let prisma: { user: { findMany: jest.Mock }; follow: { findMany: jest.Mock } }
  let repo: FollowsRepository

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue([]) },
      follow: { findMany: jest.fn() },
    }
    repo = new FollowsRepository(prisma as any)
  })

  describe('findMentionable', () => {
    it('matches followers or following by name prefix, excluding self, max 8 by name', async () => {
      await repo.findMentionable('me', 'ja')

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'me' },
          name: { startsWith: 'ja', mode: 'insensitive' },
          OR: [
            { following: { some: { followingId: 'me' } } },
            { followers: { some: { followerId: 'me' } } },
          ],
        },
        select: { id: true, name: true, image: true },
        orderBy: { name: 'asc' },
        take: 8,
      })
    })
  })

  describe('filterConnected', () => {
    it('returns ids linked in either direction and skips the query for no ids', async () => {
      expect(await repo.filterConnected('me', [])).toEqual([])
      expect(prisma.follow.findMany).not.toHaveBeenCalled()

      prisma.follow.findMany.mockResolvedValue([
        { followerId: 'me', followingId: 'a' },
        { followerId: 'b', followingId: 'me' },
      ])
      expect(await repo.filterConnected('me', ['a', 'b', 'stranger'])).toEqual(['a', 'b'])
    })
  })
})

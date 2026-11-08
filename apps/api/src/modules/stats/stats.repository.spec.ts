import { Prisma } from '@/generated/prisma/client'
import { UniversityScope } from '@/common/university-scope'
import { StatsRepository } from './stats.repository'

const ALL: UniversityScope = { kind: 'all' }
const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const NONE: UniversityScope = { kind: 'none' }
const IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('StatsRepository university scope', () => {
  let prisma: any
  let repository: StatsRepository

  beforeEach(() => {
    prisma = {
      user: { count: jest.fn().mockResolvedValue(0) },
      post: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      comment: { count: jest.fn().mockResolvedValue(0) },
      reaction: { count: jest.fn().mockResolvedValue(0) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    }
    repository = new StatsRepository(prisma)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  async function countAll(scope: UniversityScope) {
    await Promise.all([
      repository.countUsers(scope),
      repository.countPosts(scope),
      repository.countComments(scope),
      repository.countReactions(scope),
      repository.findTopPostsByViews(scope),
      repository.findTopPostsByReactions(scope),
    ])
  }

  it("counts only the moderator's university", async () => {
    await countAll(U1)

    expect(whereOf(prisma.user.count)).toEqual({
      isAnonymous: false,
      AND: [{ universityId: 'u1' }],
    })
    expect(whereOf(prisma.post.count)).toEqual({ deletedAt: null, AND: [IN_U1] })
    expect(whereOf(prisma.comment.count)).toEqual({ deletedAt: null, post: IN_U1 })
    expect(whereOf(prisma.reaction.count)).toEqual({ post: IN_U1 })
    for (const call of prisma.post.findMany.mock.calls) {
      expect(call[0].where).toEqual({ deletedAt: null, status: 'APPROVED', AND: [IN_U1] })
    }
  })

  it('counts nothing for a moderator with no university', async () => {
    await countAll(NONE)

    const none = { course: { id: { in: [] } } }
    expect(whereOf(prisma.user.count).AND).toEqual([{ id: { in: [] } }])
    expect(whereOf(prisma.post.count).AND).toEqual([none])
    expect(whereOf(prisma.comment.count).post).toEqual(none)
    expect(whereOf(prisma.reaction.count).post).toEqual(none)
  })

  it('counts every university for an admin', async () => {
    await countAll(ALL)

    expect(whereOf(prisma.user.count)).toEqual({ isAnonymous: false, AND: [{}] })
    expect(whereOf(prisma.post.count)).toEqual({ deletedAt: null, AND: [{}] })
    expect(whereOf(prisma.comment.count)).toEqual({ deletedAt: null, post: {} })
    expect(whereOf(prisma.reaction.count)).toEqual({ post: {} })
  })

  describe('findTopUsersByPostCount', () => {
    const sqlOf = () => prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql

    it('binds the university as a parameter for users and their posts', async () => {
      await repository.findTopUsersByPostCount(U1)

      const query = sqlOf()
      expect(query.sql).toContain('JOIN "faculty" f ON f.id = pd."facultyId"')
      expect(query.sql).toContain('f."universityId" = ?')
      expect(query.sql).toContain('AND u."universityId" = ?')
      expect(query.sql).toContain('WHERE u."isAnonymous" IS NOT TRUE')
      expect(query.sql).not.toContain('u1')
      expect(query.values).toEqual(['u1', 'u1'])
    })

    it('has no university filter for an admin', async () => {
      await repository.findTopUsersByPostCount(ALL)

      const query = sqlOf()
      expect(query.sql).not.toContain('universityId')
      expect(query.sql).toContain('WHERE u."isAnonymous" IS NOT TRUE')
      expect(query.values).toEqual([])
    })

    it('returns no users without querying for a moderator with no university', async () => {
      await expect(repository.findTopUsersByPostCount(NONE)).resolves.toEqual([])
      expect(prisma.$queryRaw).not.toHaveBeenCalled()
    })
  })
})

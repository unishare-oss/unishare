import { UniversityScope } from '@/common/university-scope'
import { ReadingListsService } from './reading-lists.service'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const POSTS_IN_U1 = {
  where: { post: { course: { department: { faculty: { universityId: 'u1' } } } } },
}

const publicList = { id: 'list-1', userId: 'owner', isPublic: true, _count: { posts: 1 } }

describe('ReadingListsService university scope', () => {
  let prisma: { readingList: { findMany: jest.Mock; findUnique: jest.Mock } }
  let service: ReadingListsService

  beforeEach(() => {
    prisma = {
      readingList: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(publicList),
      },
    }
    service = new ReadingListsService(prisma as any)
  })

  const includeOf = (mock: jest.Mock) => mock.mock.calls[0][0].include

  it.each([
    ['findPublicForUser', (s: ReadingListsService) => s.findPublicForUser('owner', U1)],
    ['findAllForUser', (s: ReadingListsService) => s.findAllForUser('owner', U1)],
  ])("%s counts and lists only posts in the requester's university", async (_name, call) => {
    await call(service)
    expect(includeOf(prisma.readingList.findMany)).toEqual({
      _count: { select: { posts: POSTS_IN_U1 } },
      posts: { ...POSTS_IN_U1, select: { postId: true } },
    })
  })

  it("findOne still opens another university's public list, counting only posts in scope", async () => {
    await expect(service.findOne('list-1', U1, 'viewer')).resolves.toMatchObject({
      id: 'list-1',
      postCount: 1,
    })
    expect(includeOf(prisma.readingList.findUnique)).toEqual({
      _count: { select: { posts: POSTS_IN_U1 } },
    })
  })

  it('counts no posts for a member with no university', async () => {
    await service.findAllForUser('owner', { kind: 'none' })
    expect(includeOf(prisma.readingList.findMany)._count).toEqual({
      select: { posts: { where: { post: { course: { id: { in: [] } } } } } },
    })
  })

  it("refuses to add another university's post to a list, and writes nothing", async () => {
    const owned = { userId: 'owner' }
    const full = {
      readingList: { findUnique: jest.fn().mockResolvedValue(owned) },
      post: { findFirst: jest.fn().mockResolvedValue(null) },
      readingListPost: { upsert: jest.fn() },
    }
    const svc = new ReadingListsService(full as any)
    await expect(svc.addPost('list-1', 'p1', 'owner', U1)).rejects.toThrow('Post not found')
    expect(full.post.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          { id: 'p1', deletedAt: null },
          { course: { department: { faculty: { universityId: 'u1' } } } },
        ],
      },
      select: { id: true },
    })
    expect(full.readingListPost.upsert).not.toHaveBeenCalled()
  })
})

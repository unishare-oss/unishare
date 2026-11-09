import { UniversityScope } from '@/common/university-scope'
import { PostsRepository } from './posts.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const NONE: UniversityScope = { kind: 'none' }
const IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('PostsRepository university scope', () => {
  let prisma: { post: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock } }
  let repository: PostsRepository

  beforeEach(() => {
    prisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    }
    repository = new PostsRepository(prisma as any)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  it('findInScope adds the scope to the id lookup', async () => {
    await expect(repository.findInScope('p1', U1)).resolves.toBeNull()
    expect(whereOf(prisma.post.findUnique)).toEqual({ id: 'p1', deletedAt: null, AND: [IN_U1] })
  })

  it('findInScope matches nothing for a member with no university', async () => {
    await repository.findInScope('p1', NONE)
    expect(whereOf(prisma.post.findUnique)).toEqual({
      id: 'p1',
      deletedAt: null,
      AND: [{ course: { id: { in: [] } } }],
    })
  })

  it('findByShortCode adds the scope to the short code lookup', async () => {
    await repository.findByShortCode('abc', U1)
    expect(whereOf(prisma.post.findUnique)).toEqual({
      shortCode: 'abc',
      deletedAt: null,
      AND: [IN_U1],
    })
  })

  it.each([
    ['findIdInScope', (r: PostsRepository) => r.findIdInScope('p1', U1)],
    ['findNotificationTarget', (r: PostsRepository) => r.findNotificationTarget('p1', U1)],
  ])('%s adds the scope to the parent post lookup', async (_name, call) => {
    await call(repository)
    expect(whereOf(prisma.post.findUnique)).toEqual({ id: 'p1', deletedAt: null, AND: [IN_U1] })
  })

  it('findSaved combines the saved filter and the scope in AND, for the page and the count', async () => {
    await repository.findSaved({ id: 'user-1' }, U1, {})
    const expected = {
      AND: [{ savedBy: { some: { userId: 'user-1' } }, deletedAt: null }, IN_U1],
    }
    expect(whereOf(prisma.post.findMany)).toEqual(expected)
    expect(whereOf(prisma.post.count)).toEqual(expected)
  })

  it('findByReadingList keeps only the posts in scope, for the page and the count', async () => {
    await repository.findByReadingList('list-1', U1, {}, {})
    const expected = {
      AND: [{ readingListItems: { some: { listId: 'list-1' } }, deletedAt: null }, IN_U1],
    }
    expect(whereOf(prisma.post.findMany)).toEqual(expected)
    expect(whereOf(prisma.post.count)).toEqual(expected)
  })

  it('findByReadingList shows nothing to a member with no university', async () => {
    await repository.findByReadingList('list-1', NONE, {}, {})
    expect(whereOf(prisma.post.findMany).AND[1]).toEqual({ course: { id: { in: [] } } })
  })
})

import { CommentsService } from './comments.service'
import { NotificationsService } from '../../notifications/notifications.service'

const base = {
  content: 'hi',
  userId: 'u1',
  postId: 'p1',
  parentId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'u1', name: 'Me', image: null },
}

describe('CommentsService mentions', () => {
  let repo: any
  let follows: { keepConnected: jest.Mock }
  let posts: any
  let notificationsRepo: { create: jest.Mock; createMentions: jest.Mock }
  let service: CommentsService

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue({ ...base, id: 'parent', postId: 'p1' }),
      findAll: jest.fn(),
      findUserNames: jest.fn().mockResolvedValue([{ id: 'j', name: 'Jane Doe' }]),
    }
    follows = { keepConnected: jest.fn().mockResolvedValue(['j']) }
    posts = {
      getNotificationTarget: jest.fn().mockResolvedValue({ authorId: 'x', title: 't' }),
      assertCommentTargetExists: jest.fn(),
    }
    notificationsRepo = {
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
      createMentions: jest.fn().mockImplementation((rows) => Promise.resolve(rows)),
    }
    service = new CommentsService(
      repo,
      posts,
      new NotificationsService(notificationsRepo as any),
      { record: jest.fn() } as any,
      follows as any,
    )
  })

  it.each([
    ['a comment', {}],
    ['a reply', { parentId: 'parent' }],
  ])('create passes the connected ids to the repository for %s', async (_n, extra) => {
    repo.create.mockResolvedValue({ ...base, id: 'c1', mentionIds: ['j'] })
    const dto = { content: 'hi @Jane Doe', mentions: ['j', 'stranger'], ...extra }

    const result = await service.create('p1', dto, 'u1')

    expect(follows.keepConnected).toHaveBeenCalledWith('u1', ['j', 'stranger'])
    expect(repo.create).toHaveBeenCalledWith('p1', 'u1', dto, ['j'])
    expect(result.mentions).toEqual([{ id: 'j', name: 'Jane Doe' }])
    expect(result).not.toHaveProperty('mentionIds')
  })

  it('create defaults mentions to an empty list', async () => {
    repo.create.mockResolvedValue({ ...base, id: 'c1', mentionIds: [] })
    await service.create('p1', { content: 'hi' }, 'u1')
    expect(follows.keepConnected).toHaveBeenCalledWith('u1', [])
  })

  it('findAll returns mentions for a live comment and [] for a deleted one', async () => {
    repo.findAll.mockResolvedValue([
      { ...base, id: 'live', mentionIds: ['j'] },
      { ...base, id: 'dead', mentionIds: ['j'], deletedAt: new Date() },
    ])

    const result = await service.findAll('p1')

    expect(result.find((c) => c.id === 'live')?.mentions).toEqual([{ id: 'j', name: 'Jane Doe' }])
    expect(result.find((c) => c.id === 'dead')?.mentions).toEqual([])
    expect(repo.findUserNames).toHaveBeenCalledTimes(1)
  })

  it('notifies a mentioned post author with MENTION only, not COMMENT_ADDED', async () => {
    posts.getNotificationTarget.mockResolvedValue({ authorId: 'j', title: 'Notes' })
    repo.create.mockResolvedValue({ ...base, id: 'c1', mentionIds: ['j'] })

    await service.create('p1', { content: 'hi @Jane Doe', mentions: ['j'] }, 'u1')
    await new Promise((resolve) => setImmediate(resolve))

    expect(notificationsRepo.createMentions).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'j', type: 'MENTION', postId: 'p1', commentId: 'c1' }),
    ])
    expect(notificationsRepo.create).not.toHaveBeenCalled()
  })

  it('still sends COMMENT_ADDED to a post author who is not mentioned', async () => {
    repo.create.mockResolvedValue({ ...base, id: 'c1', mentionIds: ['j'] })

    await service.create('p1', { content: 'hi @Jane Doe', mentions: ['j'] }, 'u1')
    await new Promise((resolve) => setImmediate(resolve))

    expect(notificationsRepo.createMentions).toHaveBeenCalledTimes(1)
    expect(notificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'x', type: 'COMMENT_ADDED' }),
    )
  })
})

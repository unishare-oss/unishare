import { Logger } from '@nestjs/common'
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
      update: jest.fn(),
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

  it('still returns the comment and logs when a notification write fails', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const unhandled = jest.fn()
    process.on('unhandledRejection', unhandled)
    notificationsRepo.createMentions.mockRejectedValue(new Error('connection lost'))
    notificationsRepo.create.mockRejectedValue(new Error('connection lost'))
    repo.create.mockResolvedValue({ ...base, id: 'c1', mentionIds: ['j'] })

    const result = await service.create('p1', { content: 'hi @Jane Doe', mentions: ['j'] }, 'u1')
    await new Promise((resolve) => setImmediate(resolve))

    expect(result.id).toBe('c1')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('mention notifications for comment c1'),
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('comment notifications for comment c1'),
    )
    expect(unhandled).not.toHaveBeenCalled()
    process.off('unhandledRejection', unhandled)
    warn.mockRestore()
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

  describe('update', () => {
    const edit = (dto: { content?: string; mentions?: string[] }) =>
      service.update('p1', 'c1', dto, 'u1')

    beforeEach(() => {
      repo.findById.mockResolvedValue({ ...base, id: 'c1' })
      repo.update.mockImplementation((_id: string, _dto: unknown, mentionIds?: string[]) =>
        Promise.resolve({ ...base, id: 'c1', mentionIds: mentionIds ?? ['j'] }),
      )
    })

    it('saves the connected ids when mentions are sent', async () => {
      const dto = { content: 'hi @Jane Doe', mentions: ['j', 'stranger'] }

      const result = await edit(dto)

      expect(follows.keepConnected).toHaveBeenCalledWith('u1', ['j', 'stranger'])
      expect(repo.update).toHaveBeenCalledWith('c1', dto, ['j'])
      expect(result.mentions).toEqual([{ id: 'j', name: 'Jane Doe' }])
      expect(result).not.toHaveProperty('mentionIds')
    })

    it('keeps the saved mentions and notifies nobody when mentions are omitted', async () => {
      const result = await edit({ content: 'new text' })
      await new Promise((resolve) => setImmediate(resolve))

      expect(follows.keepConnected).not.toHaveBeenCalled()
      expect(repo.update).toHaveBeenCalledWith('c1', { content: 'new text' }, undefined)
      expect(notificationsRepo.createMentions).not.toHaveBeenCalled()
      expect(result.mentions).toEqual([{ id: 'j', name: 'Jane Doe' }])
    })

    it('clears the mentions and sends nothing for an empty list', async () => {
      follows.keepConnected.mockResolvedValue([])

      const result = await edit({ mentions: [] })
      await new Promise((resolve) => setImmediate(resolve))

      expect(repo.update).toHaveBeenCalledWith('c1', { mentions: [] }, [])
      expect(notificationsRepo.createMentions).not.toHaveBeenCalled()
      expect(result.mentions).toEqual([])
    })

    it('notifies the full new list through the dedupe path, not only the new people', async () => {
      follows.keepConnected.mockResolvedValue(['j', 'k'])

      await edit({ mentions: ['j', 'k'] })
      await new Promise((resolve) => setImmediate(resolve))

      expect(notificationsRepo.createMentions).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'j', commentId: 'c1', type: 'MENTION' }),
        expect.objectContaining({ userId: 'k', commentId: 'c1', type: 'MENTION' }),
      ])
    })

    it('does not notify a person again when an edit removes and re-adds them', async () => {
      // Honour @@unique([commentId, userId]): only rows not saved before come back.
      const saved = new Set<string>()
      notificationsRepo.createMentions.mockImplementation(
        (rows: { userId: string; commentId: string }[]) => {
          const fresh = rows.filter((row) => !saved.has(`${row.commentId}:${row.userId}`))
          fresh.forEach((row) => saved.add(`${row.commentId}:${row.userId}`))
          return Promise.resolve(fresh)
        },
      )
      const streamed: string[] = []
      const notifications = (service as any).notificationsService as NotificationsService
      notifications.streamForUser('b').subscribe(() => streamed.push('b'))
      const editTo = async (ids: string[]) => {
        follows.keepConnected.mockResolvedValue(ids)
        await edit({ mentions: ids })
        await new Promise((resolve) => setImmediate(resolve))
      }

      await editTo(['b'])
      await editTo([])
      await editTo(['b'])

      expect(notificationsRepo.createMentions).toHaveBeenCalledTimes(2)
      expect(saved).toEqual(new Set(['c1:b']))
      expect(streamed).toEqual(['b'])
    })

    it('logs and still returns the comment when the mention notification fails', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      const unhandled = jest.fn()
      process.on('unhandledRejection', unhandled)
      notificationsRepo.createMentions.mockRejectedValue(new Error('connection lost'))

      const result = await edit({ mentions: ['j'] })
      await new Promise((resolve) => setImmediate(resolve))

      expect(result.id).toBe('c1')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('mention notifications for comment c1'),
      )
      expect(unhandled).not.toHaveBeenCalled()
      process.off('unhandledRejection', unhandled)
      warn.mockRestore()
    })
  })
})

import { firstValueFrom } from 'rxjs'
import { NotificationsService } from './notifications.service'

describe('NotificationsService mentions', () => {
  let repo: { create: jest.Mock; createMentions: jest.Mock }
  let service: NotificationsService

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
      createMentions: jest
        .fn()
        .mockImplementation((rows: { userId: string }[]) =>
          Promise.resolve(rows.map((row, i) => ({ id: `n${i}`, ...row }))),
        ),
    }
    service = new NotificationsService(repo as any)
  })

  it('saves one MENTION row per recipient and streams each to its recipient', async () => {
    const a = firstValueFrom(service.streamForUser('a'))
    const b = firstValueFrom(service.streamForUser('b'))
    const other = jest.fn()
    service.streamForUser('c').subscribe(other)

    await service.notifyMentions({
      postId: 'p1',
      commentId: 'c1',
      actorName: 'Jane',
      postTitle: 'Notes',
      recipientIds: ['a', 'b'],
    })

    const message = 'Jane mentioned you in a comment on "Notes".'
    expect(repo.createMentions).toHaveBeenCalledWith([
      { userId: 'a', type: 'MENTION', message, postId: 'p1', commentId: 'c1' },
      { userId: 'b', type: 'MENTION', message, postId: 'p1', commentId: 'c1' },
    ])
    expect(await a).toEqual({ data: expect.objectContaining({ userId: 'a', commentId: 'c1' }) })
    expect(await b).toEqual({ data: expect.objectContaining({ userId: 'b', commentId: 'c1' }) })
    expect(other).not.toHaveBeenCalled()
  })

  it('streams only the rows the repository returns, so an already-notified person gets none', async () => {
    repo.createMentions.mockResolvedValue([
      { id: 'n1', userId: 'b', type: 'MENTION', commentId: 'c1' },
    ])
    const a = jest.fn()
    const b = firstValueFrom(service.streamForUser('b'))
    service.streamForUser('a').subscribe(a)

    await service.notifyMentions({
      postId: 'p1',
      commentId: 'c1',
      actorName: 'Jane',
      recipientIds: ['a', 'b'],
    })

    expect(await b).toEqual({ data: expect.objectContaining({ userId: 'b' }) })
    expect(a).not.toHaveBeenCalled()
  })

  it('saves nothing when nobody is mentioned', async () => {
    await service.notifyMentions({
      postId: 'p1',
      commentId: 'c1',
      actorName: 'Jane',
      recipientIds: [],
    })
    expect(repo.createMentions).not.toHaveBeenCalled()
  })

  it('notifyComment skips the post author when they are in exceptUserIds', async () => {
    await service.notifyComment('p1', 'author', 'u1', 'Notes', 'Jane', ['author'])
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('notifyComment still notifies the post author when not excluded', async () => {
    await service.notifyComment('p1', 'author', 'u1', 'Notes', 'Jane', ['other'])
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'author', type: 'COMMENT_ADDED' }),
    )
  })
})

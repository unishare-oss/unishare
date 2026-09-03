import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'
import { UserRole } from '@/generated/prisma/client'
import { DecksService } from './decks.service'
import { DECK_EDITOR } from './deck-generator.port'
import {
  DAILY_DECK_QUOTA,
  DECK_QUEUE,
  DECK_RENDER_QUEUE,
  MAX_ATTEMPTS,
  WAITING_SCAN_LIMIT,
} from './decks.constants'

/**
 * Covers the two behaviours that are easy to get subtly wrong and expensive when they are:
 * the quota that stands between a bored student and an unbounded model bill, and the queue
 * position a student is shown while waiting.
 *
 * Generation itself is not exercised here — that lives behind DeckGenerator precisely so it
 * can be faked, and the processor is where it belongs.
 */
describe('DecksService', () => {
  let service: DecksService
  let prisma: {
    deck: {
      create: jest.Mock
      update: jest.Mock
      count: jest.Mock
      updateMany: jest.Mock
      findFirst: jest.Mock
      findMany: jest.Mock
    }
  }
  let queue: { add: jest.Mock; getWaiting: jest.Mock; getJob: jest.Mock }
  let renderQueue: { add: jest.Mock }
  let editor: {
    listTemplates: jest.Mock
    reexport: jest.Mock
    deletePresentation: jest.Mock
  }

  let storage: { deleteFile: jest.Mock; generatePresignedDownloadUrl: jest.Mock }

  beforeEach(async () => {
    storage = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      generatePresignedDownloadUrl: jest.fn().mockResolvedValue('https://signed.example/deck'),
    }
    prisma = {
      deck: {
        create: jest.fn().mockResolvedValue({ id: 'deck-1' }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'deck-1',
          prompt: 'p',
          title: null,
          slideCount: 8,
          language: 'English',
          template: 'general',
          status: 'QUEUED',
          error: null,
          createdAt: new Date(),
          completedAt: null,
          ...data,
        })),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getWaiting: jest.fn(),
      getJob: jest.fn().mockResolvedValue(null),
    }
    renderQueue = { add: jest.fn().mockResolvedValue({ id: 'render-1' }) }
    // The fake the port exists for: the whole editing surface, with no generator running.
    editor = {
      listTemplates: jest.fn().mockResolvedValue([]),
      reexport: jest.fn(),
      deletePresentation: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: getQueueToken(DECK_QUEUE), useValue: queue },
        { provide: getQueueToken(DECK_RENDER_QUEUE), useValue: renderQueue },
        { provide: DECK_EDITOR, useValue: editor },
      ],
    }).compile()

    service = module.get(DecksService)
  })

  describe('quota', () => {
    /** n decks in the window, oldest first, each an hour apart ending `hoursAgo` back. */
    const window = (n: number, oldestHoursAgo = 20) =>
      Array.from({ length: n }, (_, i) => ({
        createdAt: new Date(Date.now() - (oldestHoursAgo - i) * 60 * 60 * 1000),
      }))

    it('queues immediately when under quota', async () => {
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA - 1))
      await service.createDeck('user-1', { prompt: 'a topic worth covering' })
      const [, , opts] = queue.add.mock.calls[0]
      expect(opts.delay).toBeUndefined()
    })

    it('accepts and delays the deck instead of refusing when quota is spent', async () => {
      // The old behaviour was a 429. Losing the request is worse than making it wait: the
      // student already wrote the prompt.
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA))
      await service.createDeck('user-1', { prompt: 'a topic worth covering' })
      expect(queue.add).toHaveBeenCalledTimes(1)
      const [, , opts] = queue.add.mock.calls[0]
      expect(opts.delay).toBeGreaterThan(0)
      expect(prisma.deck.create.mock.calls[0][0].data.scheduledFor).toBeInstanceOf(Date)
    })

    it('stacks the delay so a second held deck waits for the second slot', async () => {
      // used = limit + 1 -> waits for the SECOND oldest to age out, not the first.
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA + 1))
      const quota = await service.getQuota('user-1')
      const rows = prisma.deck.findMany.mock.results[0].value as Promise<{ createdAt: Date }[]>
      const list = await rows
      expect(quota.nextSlotAt?.getTime()).toBe(list[1].createdAt.getTime() + 24 * 60 * 60 * 1000)
    })

    it('counts deleted decks against the quota', async () => {
      // The point of a soft delete. If deletion refunded the slot, "delete and regenerate"
      // would be an unlimited allowance — so this query, alone in the service, must NOT
      // filter on deletedAt.
      await service.getQuota('user-1')
      expect(prisma.deck.findMany.mock.calls[0][0].where).not.toHaveProperty('deletedAt')
    })

    it('excludes failed decks from the quota', async () => {
      // A deck that errored produced nothing. Charging a slot for it, with no free retry,
      // was the bug.
      await service.getQuota('user-1')
      expect(prisma.deck.findMany.mock.calls[0][0].where.status).toEqual({ not: 'FAILED' })
    })

    /**
     * Administrators are uncapped so that deck generation can be exercised against the real
     * provider without spending a student's three. `limit: null` is the whole mechanism --
     * see getQuota -- and null rather than a large number so a forgotten comparison fails
     * loudly instead of silently re-capping.
     */
    it('reports no limit for an administrator', async () => {
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA + 5))
      const quota = await service.getQuota('admin-1', UserRole.ADMIN)
      expect(quota.limit).toBeNull()
      // No cap means nothing to wait for, however many decks are already in the window.
      expect(quota.nextSlotAt).toBeNull()
    })

    it('never holds an administrator deck, however many are in the window', async () => {
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA + 5))
      await service.createDeck('admin-1', { prompt: 'a topic worth covering' }, UserRole.ADMIN)
      const [, , opts] = queue.add.mock.calls[0]
      expect(opts.delay).toBeUndefined()
      expect(prisma.deck.create.mock.calls[0][0].data.scheduledFor).toBeNull()
    })

    it.each([undefined, UserRole.STUDENT, UserRole.MODERATOR])('still caps %s', async (role) => {
      prisma.deck.findMany.mockResolvedValue(window(DAILY_DECK_QUOTA))
      const quota = await service.getQuota('user-1', role)
      expect(quota.limit).toBe(DAILY_DECK_QUOTA)
    })

    it('configures retries with backoff', async () => {
      prisma.deck.findMany.mockResolvedValue([])
      await service.createDeck('user-1', { prompt: 'a topic worth covering' })
      const [, , opts] = queue.add.mock.calls[0]
      expect(opts.attempts).toBe(MAX_ATTEMPTS)
      expect(opts.backoff).toMatchObject({ type: 'exponential' })
    })
  })

  /**
   * A share token is an unauthenticated capability, so these cover the two ways that goes
   * wrong: handing it to the wrong person, and failing to take it back.
   */
  describe('sharing', () => {
    const ready = {
      id: 'deck-1',
      ownerId: 'user-1',
      status: 'READY',
      title: 'Vocabulary',
      slideCount: 14,
      template: 'modern',
      createdAt: new Date(),
      key: 'k.pptx',
      pdfKey: null,
      shareToken: null,
      prompt: 'the prompt the student typed',
    }

    it('mints a token and stores it', async () => {
      prisma.deck.findFirst.mockResolvedValue(ready)
      const { shareToken } = await service.createShareLink('deck-1', 'user-1')
      expect(shareToken).toHaveLength(21)
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck-1' },
        data: { shareToken },
      })
    })

    it('returns the existing token instead of rotating it', async () => {
      // A second "Copy link" must not invalidate the link already pasted somewhere.
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 'existing-token' })
      const { shareToken } = await service.createShareLink('deck-1', 'user-1')
      expect(shareToken).toBe('existing-token')
      expect(prisma.deck.update).not.toHaveBeenCalled()
    })

    it('refuses to share a deck the caller does not own', async () => {
      prisma.deck.findFirst.mockResolvedValue({ ...ready, ownerId: 'someone-else' })
      await expect(service.createShareLink('deck-1', 'user-1')).rejects.toThrow(/Access denied/)
      expect(prisma.deck.update).not.toHaveBeenCalled()
    })

    it('revoking clears the token', async () => {
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 'live-token' })
      await service.revokeShareLink('deck-1', 'user-1')
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck-1' },
        data: { shareToken: null },
      })
    })

    it('withholds the prompt and the owner from a shared view', async () => {
      // The whole reason getSharedDeck does not return a DeckEntity.
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 'live-token' })
      const shared = await service.getSharedDeck('live-token')
      expect(shared).not.toHaveProperty('prompt')
      expect(shared).not.toHaveProperty('ownerId')
      expect(shared).not.toHaveProperty('error')
      expect(shared.title).toBe('Vocabulary')
    })

    it('offers only the formats that exist', async () => {
      // A failed preview render leaves pdfKey null while the pptx is fine.
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 't', pdfKey: null })
      expect((await service.getSharedDeck('t')).formats).toEqual(['pptx'])

      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 't', pdfKey: 'k.pdf' })
      expect((await service.getSharedDeck('t')).formats).toEqual(['pptx', 'pdf'])
    })

    it('refuses an unknown or revoked token', async () => {
      prisma.deck.findFirst.mockResolvedValue(null)
      await expect(service.getSharedDeck('nope')).rejects.toThrow(/no longer valid/)
    })

    it('never resolves a token on a soft-deleted deck', async () => {
      prisma.deck.findFirst.mockResolvedValue(null)
      await expect(service.getSharedDeck('t')).rejects.toThrow()
      expect(prisma.deck.findFirst.mock.calls[0][0].where).toMatchObject({ deletedAt: null })
    })

    it('says a deck is still generating rather than that the link is broken', async () => {
      // The link IS valid; telling the holder otherwise sends them back for a new one.
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 't', status: 'GENERATING' })
      await expect(service.getSharedDeck('t')).rejects.toThrow(/still being generated/)
    })

    it('presigns a download for a valid token', async () => {
      prisma.deck.findFirst.mockResolvedValue({ ...ready, shareToken: 't' })
      const res = await service.getSharedDownloadUrl('t', 'pptx')
      expect(res.url).toBe('https://signed.example/deck')
      expect(storage.generatePresignedDownloadUrl).toHaveBeenCalledWith(
        'k.pptx',
        3600,
        'Vocabulary.pptx',
      )
    })
  })

  describe('queue position', () => {
    const queued = {
      id: 'deck-1',
      ownerId: 'user-1',
      prompt: 'p',
      title: null,
      slideCount: 8,
      language: 'English',
      template: 'general',
      status: 'QUEUED',
      error: null,
      jobId: 'job-1',
      createdAt: new Date(),
      completedAt: null,
    }

    beforeEach(() => {
      prisma.deck.findFirst.mockResolvedValue(queued)
    })

    it('reports the FIFO index as the number ahead', async () => {
      queue.getWaiting.mockResolvedValue([{ id: 'job-0' }, { id: 'job-x' }, { id: 'job-1' }])
      const deck = await service.getDeck('deck-1', 'user-1')
      expect(deck.queueAhead).toBe(2)
      expect(deck.queueAheadIsApproximate).toBe(false)
    })

    it('reports zero ahead when the job has left the waiting list', async () => {
      queue.getWaiting.mockResolvedValue([{ id: 'job-9' }])
      const deck = await service.getDeck('deck-1', 'user-1')
      expect(deck.queueAhead).toBe(0)
    })

    it('marks the position approximate beyond the scan limit', async () => {
      queue.getWaiting.mockResolvedValue(
        Array.from({ length: WAITING_SCAN_LIMIT }, (_, i) => ({ id: `other-${i}` })),
      )
      const deck = await service.getDeck('deck-1', 'user-1')
      expect(deck.queueAhead).toBe(WAITING_SCAN_LIMIT)
      expect(deck.queueAheadIsApproximate).toBe(true)
    })

    it('computes positions for a list with one queue read, not one per deck', async () => {
      // A 30-deck page must not make 30 identical Redis round-trips, and the list must not
      // say "waiting" while the deck page says "3 ahead" for the same deck.
      queue.getWaiting.mockResolvedValue([{ id: 'job-a' }, { id: 'job-b' }, { id: 'job-c' }])
      prisma.deck.findMany.mockResolvedValue([
        { ...queued, id: 'd1', jobId: 'job-c' },
        { ...queued, id: 'd2', jobId: 'job-a' },
        { ...queued, id: 'd3', status: 'READY', jobId: null },
      ])
      ;(prisma.deck as unknown as { count: jest.Mock }).count.mockResolvedValue(3)

      const res = await service.listDecks('user-1', {})
      expect(queue.getWaiting).toHaveBeenCalledTimes(1)
      expect(res.data.map((d) => d.queueAhead)).toEqual([2, 0, null])
    })

    it('reports no position for a deck held on quota', async () => {
      // It sits in the DELAYED set, not the waiting list, so a position lookup would find
      // nothing and wrongly say "starting shortly". Its wait is a clock, not a line.
      prisma.deck.findFirst.mockResolvedValue({
        ...queued,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      })
      const deck = await service.getDeck('deck-1', 'user-1')
      expect(deck.queueAhead).toBeNull()
      expect(queue.getWaiting).not.toHaveBeenCalled()
    })

    it('survives a queue lookup failure rather than failing the status request', async () => {
      queue.getWaiting.mockRejectedValue(new Error('redis is down'))
      const deck = await service.getDeck('deck-1', 'user-1')
      expect(deck.status).toBe('QUEUED')
      expect(deck.queueAheadIsApproximate).toBe(true)
    })
  })

  describe('deleting', () => {
    const ready = {
      id: 'deck-1',
      ownerId: 'user-1',
      externalId: 'ext-1',
      status: 'READY',
      key: 'decks/a.pptx',
      pdfKey: 'decks/a.pdf',
      jobId: null,
    }

    beforeEach(() => {
      prisma.deck.findFirst.mockResolvedValue(ready)
    })

    it('marks the row deleted rather than removing it', async () => {
      await service.deleteDeck('deck-1', 'user-1')
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck-1' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('removes both stored files and the generator copy', async () => {
      await service.deleteDeck('deck-1', 'user-1')
      expect(storage.deleteFile).toHaveBeenCalledWith('decks/a.pptx')
      expect(storage.deleteFile).toHaveBeenCalledWith('decks/a.pdf')
      expect(editor.deletePresentation).toHaveBeenCalledWith('ext-1', 'user-1')
    })

    it('succeeds even when the object store is unreachable', async () => {
      // The delete is already recorded by then. Failing here would tell the student their
      // deck is still there when it is not.
      storage.deleteFile.mockRejectedValue(new Error('garage is down'))
      await expect(service.deleteDeck('deck-1', 'user-1')).resolves.toBeUndefined()
    })

    it('drops a queued job so a deleted deck never generates', async () => {
      const remove = jest.fn().mockResolvedValue(undefined)
      prisma.deck.findFirst.mockResolvedValue({ ...ready, status: 'QUEUED', jobId: 'job-1' })
      queue.getJob.mockResolvedValue({ remove })
      await service.deleteDeck('deck-1', 'user-1')
      expect(remove).toHaveBeenCalled()
    })

    it('still deletes when the job cannot be removed', async () => {
      // A job the worker already holds a lock on throws here, and cannot be cancelled at all.
      prisma.deck.findFirst.mockResolvedValue({ ...ready, status: 'GENERATING', jobId: 'job-1' })
      queue.getJob.mockRejectedValue(new Error('job is locked'))
      await expect(service.deleteDeck('deck-1', 'user-1')).resolves.toBeUndefined()
      expect(prisma.deck.update).toHaveBeenCalled()
    })

    it('refuses to delete a deck the caller does not own', async () => {
      prisma.deck.findFirst.mockResolvedValue({ ...ready, ownerId: 'someone-else' })
      await expect(service.deleteDeck('deck-1', 'user-1')).rejects.toThrow()
      expect(prisma.deck.update).not.toHaveBeenCalled()
      expect(storage.deleteFile).not.toHaveBeenCalled()
    })

    it('hides an already-deleted deck instead of deleting it twice', async () => {
      prisma.deck.findFirst.mockResolvedValue(null)
      await expect(service.deleteDeck('deck-1', 'user-1')).rejects.toThrow()
    })

    it('keeps deleted decks out of the library and its count', async () => {
      await service.listDecks('user-1', {})
      expect(prisma.deck.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null })
      expect(prisma.deck.count.mock.calls[0][0].where).toMatchObject({ deletedAt: null })
    })

    it('stops the worker picking up a deleted deck', async () => {
      await service.findForJob('deck-1')
      expect(prisma.deck.findFirst).toHaveBeenCalledWith({
        where: { id: 'deck-1', deletedAt: null },
      })
    })

    it('will not publish a result onto a deck deleted mid-generation', async () => {
      prisma.deck.updateMany.mockResolvedValue({ count: 0 })
      const published = await service.markReady('deck-1', {
        key: 'k',
        pdfKey: null,
        sizeBytes: 1,
        title: 't',
        externalId: 'ext-1',
      })
      expect(published).toBe(false)
      expect(prisma.deck.updateMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null })
    })

    it('clears progress when an attempt starts', async () => {
      // Otherwise a retry opens showing the previous attempt's count, which reads as a deck
      // that got most of the way and then stopped — the opposite of what happened.
      await service.markGenerating('deck-1', 2)
      expect(prisma.deck.update.mock.calls[0][0].data).toMatchObject({
        progressPhase: null,
        progressDone: null,
        progressTotal: null,
      })
    })

    it('records progress only onto a deck that is still generating', async () => {
      // Scoped on status as well as deletedAt: the generator's last progress update and its
      // completion land within a second of each other, so an unscoped write would routinely
      // stamp progress onto a deck that is already READY.
      await service.recordProgress('deck-1', { phase: 'slides', done: 2, total: 8 })
      const call = prisma.deck.updateMany.mock.calls[0][0]
      expect(call.where).toMatchObject({ id: 'deck-1', deletedAt: null, status: 'GENERATING' })
      expect(call.data).toMatchObject({
        progressPhase: 'slides',
        progressDone: 2,
        progressTotal: 8,
      })
    })
  })

  describe('renaming', () => {
    const owned = { id: 'deck-1', ownerId: 'user-1', status: 'READY', slideCount: 3 }

    it('saves a trimmed title', async () => {
      prisma.deck.findFirst.mockResolvedValue(owned)
      await service.updateDeck('deck-1', 'user-1', { title: '  Beethoven  ' })
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck-1' },
        data: { title: 'Beethoven' },
      })
    })

    it('refuses a title that is only whitespace', async () => {
      // Would leave a blank heading and a file called "deck.pptx".
      prisma.deck.findFirst.mockResolvedValue(owned)
      await expect(service.updateDeck('deck-1', 'user-1', { title: '   ' })).rejects.toThrow()
      expect(prisma.deck.update).not.toHaveBeenCalled()
    })

    it('refuses a deck the caller does not own', async () => {
      prisma.deck.findFirst.mockResolvedValue({ ...owned, ownerId: 'someone-else' })
      await expect(service.updateDeck('deck-1', 'user-1', { title: 'x' })).rejects.toThrow()
      expect(prisma.deck.update).not.toHaveBeenCalled()
    })

    it('will not rename a deleted deck', async () => {
      prisma.deck.findFirst.mockResolvedValue(null)
      await expect(service.updateDeck('deck-1', 'user-1', { title: 'x' })).rejects.toThrow()
    })

    it('does not read the queue to rename', async () => {
      // Called from a text field; a Redis round trip per keystroke-batch reads as input lag.
      prisma.deck.findFirst.mockResolvedValue(owned)
      await service.updateDeck('deck-1', 'user-1', { title: 'Beethoven' })
      expect(queue.getWaiting).not.toHaveBeenCalled()
    })
  })

  describe('re-export', () => {
    it('queues a re-render on the render queue, never behind a generation', async () => {
      prisma.deck.findFirst.mockResolvedValue({
        id: 'deck-1',
        ownerId: 'user-1',
        externalId: 'ext-1',
        status: 'READY',
      })
      await service.requestReexport('deck-1', 'user-1')
      // Every download re-renders first, so waiting behind a multi-minute model call is the
      // difference between a download taking seconds and taking minutes.
      expect(renderQueue.add).toHaveBeenCalledWith('reexport', { deckId: 'deck-1' })
      expect(queue.add).not.toHaveBeenCalled()
    })

    it('refuses a deck the caller does not own', async () => {
      prisma.deck.findFirst.mockResolvedValue({
        id: 'deck-1',
        ownerId: 'someone-else',
        externalId: 'ext-1',
      })
      await expect(service.requestReexport('deck-1', 'user-1')).rejects.toThrow()
      expect(queue.add).not.toHaveBeenCalled()
    })
  })
})

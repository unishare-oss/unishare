import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'
import { DecksService } from './decks.service'
import { DECK_EDITOR } from './deck-generator.port'
import { DAILY_DECK_QUOTA, DECK_QUEUE, MAX_ATTEMPTS, WAITING_SCAN_LIMIT } from './decks.constants'

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
  let editor: {
    listTemplates: jest.Mock
    reexport: jest.Mock
    deletePresentation: jest.Mock
  }

  let storage: { deleteFile: jest.Mock }

  beforeEach(async () => {
    storage = { deleteFile: jest.fn().mockResolvedValue(undefined) }
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

    it('configures retries with backoff', async () => {
      prisma.deck.findMany.mockResolvedValue([])
      await service.createDeck('user-1', { prompt: 'a topic worth covering' })
      const [, , opts] = queue.add.mock.calls[0]
      expect(opts.attempts).toBe(MAX_ATTEMPTS)
      expect(opts.backoff).toMatchObject({ type: 'exponential' })
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
  })

  describe('re-export', () => {
    it('queues a re-render rather than rendering inline', async () => {
      prisma.deck.findFirst.mockResolvedValue({
        id: 'deck-1',
        ownerId: 'user-1',
        externalId: 'ext-1',
        status: 'READY',
      })
      await service.requestReexport('deck-1', 'user-1')
      expect(queue.add).toHaveBeenCalledWith('reexport', { deckId: 'deck-1' })
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

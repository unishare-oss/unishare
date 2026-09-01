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
      findFirst: jest.Mock
      findMany: jest.Mock
    }
  }
  let queue: { add: jest.Mock; getWaiting: jest.Mock }
  let editor: {
    listTemplates: jest.Mock
    getSlides: jest.Mock
    updateSlide: jest.Mock
    aiEditSlide: jest.Mock
    reexport: jest.Mock
  }

  beforeEach(async () => {
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
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }), getWaiting: jest.fn() }
    // The fake the port exists for: the whole editing surface, with no generator running.
    editor = {
      listTemplates: jest.fn().mockResolvedValue([]),
      getSlides: jest.fn().mockResolvedValue([]),
      updateSlide: jest.fn().mockResolvedValue(undefined),
      aiEditSlide: jest.fn().mockResolvedValue(undefined),
      reexport: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
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
      ;(prisma.deck as unknown as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue(queued)
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
      ;(prisma.deck as unknown as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
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

  describe('editing', () => {
    const ready = {
      id: 'deck-1',
      ownerId: 'user-1',
      externalId: 'ext-1',
      status: 'READY',
    }

    beforeEach(() => {
      ;(prisma.deck as unknown as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue(ready)
    })

    it('sends the whole slide back, not just the edited content', async () => {
      // slide_update replaces the slide. Posting only the fields the editor showed would
      // silently drop speaker_note, properties and ui.
      editor.getSlides.mockResolvedValue([
        {
          id: 's1',
          index: 0,
          layout: 'title_intro',
          content: { a: 1 },
          raw: { id: 's1', speaker_note: 'keep me' },
        },
      ])
      await service.updateSlide('deck-1', 'user-1', 's1', { a: 2 })
      expect(editor.updateSlide).toHaveBeenCalledWith(
        expect.objectContaining({ raw: { id: 's1', speaker_note: 'keep me' }, content: { a: 2 } }),
      )
    })

    it('refuses to edit a deck the caller does not own', async () => {
      ;(prisma.deck as unknown as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        ...ready,
        ownerId: 'someone-else',
      })
      await expect(service.getSlides('deck-1', 'user-1')).rejects.toThrow()
      expect(editor.getSlides).not.toHaveBeenCalled()
    })

    it('refuses to edit a deck with no external id', async () => {
      ;(prisma.deck as unknown as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        ...ready,
        externalId: null,
      })
      await expect(service.getSlides('deck-1', 'user-1')).rejects.toThrow()
    })

    it('queues a re-export rather than rendering inline', async () => {
      await service.requestReexport('deck-1', 'user-1')
      expect(queue.add).toHaveBeenCalledWith('reexport', { deckId: 'deck-1' })
    })
  })
})

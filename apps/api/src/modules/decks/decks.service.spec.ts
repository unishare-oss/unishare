import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, HttpStatus } from '@nestjs/common'
import { getQueueToken } from '@nestjs/bullmq'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'
import { DecksService } from './decks.service'
import { DECK_EDITOR } from './deck-generator.port'
import { DAILY_DECK_QUOTA, DECK_QUEUE, WAITING_SCAN_LIMIT } from './decks.constants'

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
    deck: { create: jest.Mock; update: jest.Mock; count: jest.Mock; findFirst: jest.Mock }
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
    it('queues a deck when the user is under quota', async () => {
      prisma.deck.count.mockResolvedValue(DAILY_DECK_QUOTA - 1)
      await service.createDeck('user-1', { prompt: 'a topic worth covering' })
      expect(queue.add).toHaveBeenCalledTimes(1)
    })

    it('refuses with 429, not 403, once the allowance is spent', async () => {
      prisma.deck.count.mockResolvedValue(DAILY_DECK_QUOTA)
      // 429 specifically: the frontend uses it to tell "come back later" apart from a queue
      // wait, and waiting does not clear a spent quota.
      await expect(service.createDeck('user-1', { prompt: 'a topic' })).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      })
      expect(queue.add).not.toHaveBeenCalled()
    })

    it('counts failed attempts against the quota', async () => {
      // Counting only successes would make retry-on-failure a free loop, and a late failure
      // has usually already spent the tokens.
      prisma.deck.count.mockResolvedValue(DAILY_DECK_QUOTA)
      await expect(service.createDeck('user-1', { prompt: 'a topic' })).rejects.toBeInstanceOf(
        HttpException,
      )
      const where = prisma.deck.count.mock.calls[0][0].where
      expect(where).not.toHaveProperty('status')
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

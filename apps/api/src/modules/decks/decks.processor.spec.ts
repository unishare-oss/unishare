import { Test, TestingModule } from '@nestjs/testing'
import type { Job } from 'bullmq'
import { DecksProcessor, type DeckJobData } from './decks.processor'
import { DecksService } from './decks.service'
import { DeckArtifactsService } from './deck-artifacts.service'
import { DECK_GENERATOR } from './deck-generator.port'
import { MAX_ATTEMPTS } from './decks.constants'

/**
 * Covers the retry boundary specifically.
 *
 * The original bug: every caught error marked the deck FAILED, so a deck BullMQ was still
 * retrying looked permanently dead — and because quota counted failures, a transient
 * provider blip silently cost the student a slot they could not get back.
 */
describe('DecksProcessor — retry boundary', () => {
  let processor: DecksProcessor
  let decks: {
    findForJob: jest.Mock
    markGenerating: jest.Mock
    markReady: jest.Mock
    markFailed: jest.Mock
    markRetrying: jest.Mock
    markReexported: jest.Mock
  }
  let generator: { generate: jest.Mock }
  let artifacts: { store: jest.Mock; discardOrphans: jest.Mock }

  const deck = {
    id: 'deck-1',
    ownerId: 'user-1',
    prompt: 'p',
    slideCount: 8,
    language: 'English',
    template: 'general',
    tone: 'default',
    verbosity: 'standard',
    instructions: null,
    includeTitleSlide: true,
    includeTableOfContents: false,
    webSearch: false,
    externalId: 'ext-1',
  }

  const job = (attemptsMade: number): Job<DeckJobData> =>
    ({
      name: 'generate',
      id: 'job-1',
      data: { deckId: 'deck-1' },
      attemptsMade,
      opts: { attempts: MAX_ATTEMPTS },
    }) as unknown as Job<DeckJobData>

  beforeEach(async () => {
    decks = {
      findForJob: jest.fn().mockResolvedValue(deck),
      markGenerating: jest.fn(),
      // Both return whether the write landed: false means the deck was deleted mid-flight.
      markReady: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn(),
      markRetrying: jest.fn(),
      markReexported: jest.fn().mockResolvedValue(true),
    }
    generator = { generate: jest.fn().mockRejectedValue(new Error('provider timeout')) }
    artifacts = {
      store: jest.fn().mockResolvedValue('decks/x.pptx'),
      discardOrphans: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksProcessor,
        { provide: DecksService, useValue: decks },
        { provide: DeckArtifactsService, useValue: artifacts },
        { provide: DECK_GENERATOR, useValue: generator },
      ],
    }).compile()

    processor = module.get(DecksProcessor)
  })

  it('marks retrying, not failed, while attempts remain', async () => {
    await expect(processor.process(job(0))).rejects.toThrow('provider timeout')
    expect(decks.markRetrying).toHaveBeenCalledWith('deck-1', 1, 'provider timeout')
    expect(decks.markFailed).not.toHaveBeenCalled()
  })

  it('marks failed only on the final attempt', async () => {
    await expect(processor.process(job(MAX_ATTEMPTS - 1))).rejects.toThrow('provider timeout')
    expect(decks.markFailed).toHaveBeenCalledWith('deck-1', 'provider timeout')
    expect(decks.markRetrying).not.toHaveBeenCalled()
  })

  it('rethrows so BullMQ actually schedules the retry', async () => {
    // Swallowing the error would mark the job complete and the retry would never happen.
    await expect(processor.process(job(0))).rejects.toBeInstanceOf(Error)
  })

  it('records which attempt is running', async () => {
    await expect(processor.process(job(1))).rejects.toThrow()
    expect(decks.markGenerating).toHaveBeenCalledWith('deck-1', 2)
  })

  it('drops the job when the deck has been deleted', async () => {
    decks.findForJob.mockResolvedValue(null)
    await expect(processor.process(job(0))).resolves.toBeUndefined()
    expect(generator.generate).not.toHaveBeenCalled()
    expect(decks.markFailed).not.toHaveBeenCalled()
  })

  it('generates as the deck owner, not as the shared admin account', async () => {
    // A deck generated under the administrator's credentials is invisible to the student in
    // the embedded editor and visible to everyone else — the whole reason accounts are brokered.
    generator.generate.mockResolvedValue({
      externalId: 'ext-1',
      pptx: { buffer: Buffer.from('x'), mimeType: 'application/x-pptx' },
      pdf: null,
      filename: 'deck.pptx',
    })
    await processor.process(job(0))
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'user-1' }))
  })

  it('cleans up its own output when the deck is deleted mid-generation', async () => {
    // findForJob only catches a delete that happened BEFORE the job started. Generation runs
    // for minutes, so a deck can go away while the provider is still working — and the files
    // uploaded a moment later would then belong to a row nobody can reach.
    generator.generate.mockResolvedValue({
      externalId: 'ext-1',
      pptx: { buffer: Buffer.from('x'), mimeType: 'application/x-pptx' },
      pdf: null,
      filename: 'deck.pptx',
    })
    decks.markReady.mockResolvedValue(false)

    await expect(processor.process(job(0))).resolves.toBeUndefined()
    expect(artifacts.discardOrphans).toHaveBeenCalledWith(
      'deck-1',
      ['decks/x.pptx', null],
      'ext-1',
      'user-1',
    )
    // Not a failure: the job did its work and the student got what they asked for.
    expect(decks.markFailed).not.toHaveBeenCalled()
  })
})

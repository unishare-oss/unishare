import { Test, TestingModule } from '@nestjs/testing'
import type { Job } from 'bullmq'
import { DecksRenderProcessor } from './decks-render.processor'
import { DecksService } from './decks.service'
import { DeckArtifactsService } from './deck-artifacts.service'
import { DECK_EDITOR } from './deck-generator.port'
import type { DeckJobData } from './decks.processor'

/**
 * Re-rendering, which is now on the critical path of every download — a student is waiting on
 * this, so the failure modes matter more than they did when it was an optional "update the
 * preview" step.
 */
describe('DecksRenderProcessor', () => {
  let processor: DecksRenderProcessor
  let decks: { findForJob: jest.Mock; markReexported: jest.Mock; markFailed: jest.Mock }
  let artifacts: { store: jest.Mock; discardOrphans: jest.Mock }
  let editor: { reexport: jest.Mock }

  const deck = { id: 'deck-1', ownerId: 'user-1', externalId: 'ext-1' }
  const job = {
    name: 'reexport',
    id: 'job-1',
    data: { deckId: 'deck-1' },
  } as unknown as Job<DeckJobData>

  beforeEach(async () => {
    decks = {
      findForJob: jest.fn().mockResolvedValue(deck),
      markReexported: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn(),
    }
    artifacts = {
      store: jest.fn().mockResolvedValue('decks/x.pptx'),
      discardOrphans: jest.fn().mockResolvedValue(undefined),
    }
    editor = {
      reexport: jest.fn().mockResolvedValue({
        pptx: { buffer: Buffer.from('x'), mimeType: 'application/x-pptx' },
        pdf: { buffer: Buffer.from('y'), mimeType: 'application/pdf' },
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksRenderProcessor,
        { provide: DecksService, useValue: decks },
        { provide: DeckArtifactsService, useValue: artifacts },
        { provide: DECK_EDITOR, useValue: editor },
      ],
    }).compile()

    processor = module.get(DecksRenderProcessor)
  })

  it('re-renders as the deck owner and publishes both files', async () => {
    await processor.process(job)
    // Owner, not the admin API key: the generator 404s a deck the caller does not own.
    expect(editor.reexport).toHaveBeenCalledWith('ext-1', 'user-1')
    expect(artifacts.store).toHaveBeenCalledTimes(2)
    expect(decks.markReexported).toHaveBeenCalledWith('deck-1', {
      key: 'decks/x.pptx',
      pdfKey: 'decks/x.pptx',
      sizeBytes: 1,
    })
  })

  it('drops the job when the deck has been deleted', async () => {
    decks.findForJob.mockResolvedValue(null)
    await expect(processor.process(job)).resolves.toBeUndefined()
    expect(editor.reexport).not.toHaveBeenCalled()
    expect(decks.markFailed).not.toHaveBeenCalled()
  })

  it('drops the job for a deck with no generator id', async () => {
    decks.findForJob.mockResolvedValue({ ...deck, externalId: null })
    await expect(processor.process(job)).resolves.toBeUndefined()
    expect(editor.reexport).not.toHaveBeenCalled()
  })

  it('cleans up its output when the deck is deleted while it renders', async () => {
    // markReexported is scoped on deletedAt, so a delete landing mid-render loses the race and
    // the files just uploaded belong to nothing.
    decks.markReexported.mockResolvedValue(false)
    await expect(processor.process(job)).resolves.toBeUndefined()
    expect(artifacts.discardOrphans).toHaveBeenCalledWith(
      'deck-1',
      ['decks/x.pptx', 'decks/x.pptx'],
      'ext-1',
      'user-1',
    )
    expect(decks.markFailed).not.toHaveBeenCalled()
  })

  it('marks the deck failed and rethrows when the render fails', async () => {
    // Rethrown so BullMQ records the failure; the deck's previous files are untouched, which is
    // what lets the UI say the earlier version is still downloadable.
    editor.reexport.mockRejectedValue(new Error('generator exploded'))
    await expect(processor.process(job)).rejects.toThrow('generator exploded')
    expect(decks.markFailed).toHaveBeenCalledWith('deck-1', 'generator exploded')
  })
})

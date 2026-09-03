import { describe, expect, it } from 'vitest'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { deckWaitState } from './waiting-state'

/**
 * The generating copy, which is the one line a student stares at for minutes.
 *
 * Worth testing because every branch here is a claim about work we cannot see: the worker
 * polls the generator and stores what it hears, so the only alternative to reporting that
 * faithfully is inventing progress from elapsed time.
 */
function deck(over: Partial<DeckEntity> = {}): DeckEntity {
  return {
    status: 'GENERATING',
    slideCount: 8,
    progressPhase: null,
    progressDone: null,
    progressTotal: null,
    completedAt: null,
    attempts: 0,
    maxAttempts: 3,
    error: null,
    scheduledFor: null,
    queueAhead: null,
    ...over,
  } as DeckEntity
}

describe('deckWaitState — generating', () => {
  it('counts finished slides once the generator is writing them', () => {
    const state = deckWaitState(deck({ progressPhase: 'slides', progressDone: 3 }))
    expect(state?.message).toBe('Writing slides — 3 of 8 done')
  })

  it("uses the generator's own total over the count we asked for", () => {
    // Stored separately precisely so these can disagree without the sentence contradicting
    // itself. If the generator says 6, "3 of 6" is the honest line.
    const state = deckWaitState(
      deck({ slideCount: 8, progressPhase: 'slides', progressDone: 3, progressTotal: 6 }),
    )
    expect(state?.message).toBe('Writing slides — 3 of 6 done')
  })

  it('reads zero finished slides as zero, not as missing progress', () => {
    // The gap between "writing has started" and the first slide landing is a whole batch,
    // so this is a state a student will actually sit in.
    const state = deckWaitState(deck({ progressPhase: 'slides', progressDone: 0 }))
    expect(state?.message).toBe('Writing slides — 0 of 8 done')
  })

  it.each([
    ['outline', 'Planning what the slides will cover'],
    ['layout', 'Choosing a layout for each slide'],
    ['assets', 'Adding images to the slides'],
    ['finishing', 'Putting the deck together'],
    ['starting', 'Starting up'],
  ] as const)('describes the %s phase without a slide count', (phase, expected) => {
    // No count in these: done is either zero or already equal to the total, and "8 of 8"
    // next to "adding images" reads as a deck that has stalled at the finish line.
    const state = deckWaitState(deck({ progressPhase: phase, progressDone: 8 }))
    expect(state?.message).toBe(expected)
  })

  it('falls back to the old sentence when nothing has been reported yet', () => {
    // A deck between "picked up by the worker" and "first poll answered", and every deck
    // generated before progress existed. Neither is broken, so neither should look it.
    expect(deckWaitState(deck())?.message).toBe('Building 8 slides — usually a couple of minutes')
  })

  it('falls back when the generator reports a phase we do not know', () => {
    // The phase vocabulary is ours, but it is mapped from the vendor's prose, which they
    // reword. An unmapped value must degrade rather than render as an empty or raw string.
    const state = deckWaitState(deck({ progressPhase: 'reticulating' as never, progressDone: 2 }))
    expect(state?.message).toBe('Building 8 slides — usually a couple of minutes')
  })

  it('does not use progress copy for a re-render', () => {
    // A re-render reuses GENERATING but is not building slides from the prompt, and its
    // progress fields are whatever the original generation left behind.
    const state = deckWaitState(
      deck({ completedAt: '2026-09-03T00:00:00.000Z', progressPhase: 'slides', progressDone: 3 }),
    )
    expect(state?.kind).toBe('rerendering')
  })
})

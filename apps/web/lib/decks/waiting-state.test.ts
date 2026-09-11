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

  it('fills the bar to the real fraction while slides are being written', () => {
    expect(deckWaitState(deck({ progressPhase: 'slides', progressDone: 2 }))?.bar).toBeCloseTo(0.25)
  })

  it("measures the fraction against the generator's total, not ours", () => {
    const state = deckWaitState(
      deck({ slideCount: 8, progressPhase: 'slides', progressDone: 3, progressTotal: 6 }),
    )
    expect(state?.bar).toBeCloseTo(0.5)
  })

  it('clamps a count that overshoots its total', () => {
    // The two numbers arrive from separate fields on the same poll, so a generator that
    // counts a title slide it never reported would otherwise overfill the bar.
    expect(deckWaitState(deck({ progressPhase: 'slides', progressDone: 99 }))?.bar).toBe(1)
  })

  it.each(['outline', 'layout', 'assets', 'finishing', 'starting'] as const)(
    'leaves the bar indeterminate during the %s phase',
    (phase) => {
      // A fraction here would be invented: nothing tells us what share of the whole job
      // "planning the outline" represents.
      expect(deckWaitState(deck({ progressPhase: phase, progressDone: 4 }))?.bar).toBe(
        'indeterminate',
      )
    },
  )

  it('leaves the bar indeterminate before anything has been reported', () => {
    expect(deckWaitState(deck())?.bar).toBe('indeterminate')
  })

  it.each([
    ['queued', { status: 'QUEUED' as const, queueAhead: 3 }],
    ['quota-held', { scheduledFor: '2099-01-01T00:00:00.000Z', status: 'QUEUED' as const }],
    ['retrying', { status: 'QUEUED' as const, attempts: 1, error: 'provider down' }],
  ])('shows no bar for a %s deck', (_kind, over) => {
    // A bar under "4 decks ahead of yours" would say this deck is progressing, and one under
    // a retry would say the failed attempt got somewhere. Neither is true.
    expect(deckWaitState(deck(over))?.bar).toBeUndefined()
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

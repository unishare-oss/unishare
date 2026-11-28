import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { nextReveal, useSmoothText } from '@/components/ai/use-smooth-text'

/** Runs animation frames until the shown text stops changing, and counts them. */
function runFrames(max = 200): number {
  let frames = 0
  for (; frames < max; frames++) {
    const pending = vi.getTimerCount()
    if (pending === 0) break
    act(() => {
      vi.advanceTimersToNextFrame()
    })
  }
  return frames
}

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced })),
  )
}

describe('nextReveal', () => {
  it('reveals a share of what is waiting, and at least one character', () => {
    expect(nextReveal('', 'a'.repeat(120))).toHaveLength(10)
    expect(nextReveal('ab', 'abc')).toBe('abc')
  })

  it('does not split an emoji', () => {
    const target = `x${'😀'}`
    const step = nextReveal('', target)
    expect(step === 'x' || step === target).toBe(true)
    expect(nextReveal('x', target)).toBe(target)
  })

  it('jumps to text that does not continue what is shown', () => {
    expect(nextReveal('Half an ans', 'Something went wrong.')).toBe('Something went wrong.')
  })
})

describe('useSmoothText', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    stubReducedMotion(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows a finished message whole at once', () => {
    const { result } = renderHook(() => useSmoothText('A finished answer.', false))

    expect(result.current).toEqual({ shown: 'A finished answer.', revealing: false })
  })

  it('reveals a large chunk over several frames instead of all at once', () => {
    const chunk = 'An eigenvalue is a scalar that stretches its eigenvector. '.repeat(4)
    const { result } = renderHook(() => useSmoothText(chunk, true))

    expect(result.current.shown).toBe('')
    act(() => {
      vi.advanceTimersToNextFrame()
    })
    expect(result.current.shown.length).toBeGreaterThan(0)
    expect(result.current.shown.length).toBeLessThan(chunk.length)
    expect(chunk.startsWith(result.current.shown)).toBe(true)

    const frames = runFrames()
    expect(frames).toBeGreaterThan(3)
    expect(result.current).toEqual({ shown: chunk, revealing: false })
  })

  it('keeps revealing after streaming stops, so the last chunk does not pop in', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }) => useSmoothText(text, streaming),
      {
        initialProps: { text: 'x'.repeat(200), streaming: true },
      },
    )

    rerender({ text: 'x'.repeat(200), streaming: false })

    expect(result.current.revealing).toBe(true)
    runFrames()
    expect(result.current).toEqual({ shown: 'x'.repeat(200), revealing: false })
  })

  it('carries on from where it was when more text arrives', () => {
    const { result, rerender } = renderHook(({ text }) => useSmoothText(text, true), {
      initialProps: { text: 'First part. ' },
    })
    runFrames()
    expect(result.current.shown).toBe('First part. ')

    rerender({ text: 'First part. Second part.' })

    expect(result.current.shown).toBe('First part. ')
    runFrames()
    expect(result.current.shown).toBe('First part. Second part.')
  })

  it('shows replacing text at once once streaming has stopped, such as an error', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }) => useSmoothText(text, streaming),
      {
        initialProps: { text: 'Half an answer that', streaming: true },
      },
    )
    runFrames()

    rerender({ text: 'Something went wrong. Please try again.', streaming: false })

    expect(result.current).toEqual({
      shown: 'Something went wrong. Please try again.',
      revealing: false,
    })
  })

  it('starts a retried reply from nothing and animates it again', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }) => useSmoothText(text, streaming),
      {
        initialProps: { text: 'Old answer.', streaming: false },
      },
    )

    rerender({ text: 'A brand new answer that is long enough.', streaming: true })

    expect(result.current.shown.length).toBeLessThan(
      'A brand new answer that is long enough.'.length,
    )
    runFrames()
    expect(result.current.shown).toBe('A brand new answer that is long enough.')
  })

  it('shows every chunk as it lands for anyone who prefers reduced motion', () => {
    stubReducedMotion(true)

    const { result } = renderHook(() => useSmoothText('x'.repeat(300), true))

    expect(result.current).toEqual({ shown: 'x'.repeat(300), revealing: false })
  })
})

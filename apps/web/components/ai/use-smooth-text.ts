'use client'

import { useEffect, useState } from 'react'

/**
 * Each frame reveals this share of the text still waiting. The rest is the backlog, so a big
 * chunk is spread over a few frames instead of landing at once, and the reveal never trails far
 * behind: 600 waiting characters are down to about 40 within half a second.
 */
const SHARE_PER_FRAME = 1 / 12

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Moves a cut point off the first half of a surrogate pair, so an emoji is never split. */
function safeEnd(text: string, end: number): number {
  const code = text.charCodeAt(end - 1)
  return code >= 0xd800 && code <= 0xdbff ? Math.min(text.length, end + 1) : end
}

/** The next frame's text: the shown part plus a share of what is still waiting. */
export function nextReveal(shown: string, target: string): string {
  if (!target.startsWith(shown)) return target
  const backlog = target.length - shown.length
  if (backlog <= 0) return target
  const step = Math.max(1, Math.ceil(backlog * SHARE_PER_FRAME))
  return target.slice(0, safeEnd(target, shown.length + step))
}

/**
 * Text that arrives in chunks, revealed a little at a time so it reads as smooth typing.
 *
 * Providers send replies in uneven pieces (Gemini in a few large ones), and painting each piece as
 * it lands makes the text jump. This keeps what is shown apart from what has arrived, and closes
 * the gap a share at a time on every animation frame.
 *
 * - Only a reply that is streaming when it first renders, or starts to later, is animated. A
 *   finished message, such as one already on screen, is shown whole at once.
 * - Once streaming stops, the reveal carries on until it has caught up, so the last chunk does not
 *   pop in.
 * - Text that does not continue what is shown, such as an error replacing half an answer, is shown
 *   whole at once.
 * - Anyone who prefers reduced motion sees every chunk as it lands.
 *
 * `revealing` stays true until the shown text has caught up, so a caret can keep blinking.
 */
export function useSmoothText(
  text: string,
  streaming: boolean,
): { shown: string; revealing: boolean } {
  const [state, setState] = useState(() => ({ shown: streaming ? '' : text, animate: streaming }))

  // Adjusting state during render, as React recommends for state that follows a prop. Once a reply
  // starts streaming it stays animated until it has caught up. Text that no longer continues what
  // is shown is a different reply: a retry starts over from nothing, anything else shows at once.
  if (!text.startsWith(state.shown)) {
    setState({ shown: streaming ? '' : text, animate: state.animate || streaming })
  } else if (streaming && !state.animate) {
    setState({ shown: state.shown, animate: true })
  }

  const smooth = state.animate && !prefersReducedMotion()
  const shown = smooth && text.startsWith(state.shown) ? state.shown : text

  useEffect(() => {
    if (!smooth || shown.length >= text.length) return
    const frame = requestAnimationFrame(() => {
      setState((current) => ({ ...current, shown: nextReveal(current.shown, text) }))
    })
    return () => cancelAnimationFrame(frame)
  }, [smooth, shown, text])

  return { shown, revealing: shown.length < text.length }
}

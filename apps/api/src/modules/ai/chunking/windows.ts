/**
 * Characters per summarisation window (~3000 tokens).
 *
 * Sized for the worst case — a local 8k-context model, leaving room for output. Hosted
 * providers have far more headroom (llama-3.3-70b 128k, gemini-2.5-flash 1M), so raising
 * this per provider is a cheap later optimisation.
 *
 * Cost: a 40-page PDF holds roughly 100k characters, so ~9 windows plus 1 reduce — about
 * 10 LLM calls, against ~80 for per-chunk map-reduce.
 */
export const SUMMARY_WINDOW_CHARS = 12_000

const SEPARATOR = '\n\n'

/** Packs texts into windows of at most maxChars. An oversized text gets its own window. */
export function groupIntoWindows(texts: string[], maxChars = SUMMARY_WINDOW_CHARS): string[] {
  const windows: string[] = []
  let current: string[] = []
  let length = 0

  for (const text of texts) {
    const trimmed = text.trim()
    if (!trimmed) continue

    const added = current.length === 0 ? trimmed.length : trimmed.length + SEPARATOR.length

    if (current.length > 0 && length + added > maxChars) {
      windows.push(current.join(SEPARATOR))
      current = []
      length = 0
    }

    current.push(trimmed)
    length += current.length === 1 ? trimmed.length : trimmed.length + SEPARATOR.length
  }

  if (current.length > 0) windows.push(current.join(SEPARATOR))

  return windows
}

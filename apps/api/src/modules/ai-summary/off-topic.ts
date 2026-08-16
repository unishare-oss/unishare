/**
 * The refusal sentinel, and the gate that keeps it off a student's screen while a reply streams.
 *
 * Extracted from ai-summary.service.ts unchanged (the service re-exports `isOffTopicReply`, which
 * scripts/probe-rag-prompt.ts imports from there) so the streaming gate can be tested as a pure
 * function against THE SHIPPING PREDICATE rather than a lookalike of it.
 */

/**
 * Markdown emphasis and quoting around the edges of a reply, so `**OFF_TOPIC**` and
 * `"OFF_TOPIC"` still read as the sentinel. Edges only — `OFF_TOPIC` contains an underscore
 * of its own, which must survive.
 */
const EDGE_DECORATION = /^[\s*_`"'>[(]+|[\s*_`"')\]]+$/g

/** The leading half of EDGE_DECORATION. Mid-stream there is no end of line to strip from yet. */
const LEADING_DECORATION = /^[\s*_`"'>[(]+/

/**
 * The refusal sentinel, as models actually emit it.
 *
 * Matches when the reply's first line is the sentinel alone, or the sentinel followed by a
 * NON-alphanumeric separator: `OFF_TOPIC`, `off_topic`, `OFF_TOPIC.`, `OFF_TOPIC:`,
 * `**OFF_TOPIC**`, `OFF_TOPIC — this is unrelated`, or the sentinel on its own line with an
 * explanation beneath.
 *
 * It deliberately does NOT match when a letter or digit follows the token, so a reply that
 * merely discusses the word — "OFF_TOPIC is the marker the assistant returns when..." for a
 * student who asked what it means — is answered rather than swallowed as a refusal. That is
 * the line: a separator after the token means the model is signalling, ordinary prose
 * continuing the sentence means it is talking.
 *
 * Nor does it search the whole reply. A sentinel buried mid-paragraph is far more likely to
 * be discussion than a refusal, and matching anywhere would let any answer that quotes the
 * token be replaced by a refusal — a worse failure than the one being fixed.
 */
const OFF_TOPIC_SENTINEL = /^off_topic\s*(?:$|[^\p{L}\p{N}\s])/iu

/**
 * The same sentinel, minus the `$` alternative — it requires the separator to have ARRIVED.
 *
 * Mid-stream `OFF_TOPIC` on its own is not yet a refusal: the very next character decides
 * between the sentinel and "OFF_TOPIC is the marker...". Only a separator that is already in
 * the buffer proves the model was signalling, so the end-of-input alternative cannot be used
 * on a partial line — that is the whole difference between this and OFF_TOPIC_SENTINEL.
 */
const PARTIAL_SENTINEL = /^off_topic\s*[^\p{L}\p{N}\s]/iu

/** The token itself, for the "still could become the sentinel" prefix test. */
const SENTINEL_TOKEN = 'off_topic'

/**
 * The refusal predicate, as a pure function, so `scripts/probe-rag-prompt.ts` can assert THE
 * SHIPPING LOGIC against a live model rather than a lookalike of it. A probe that reimplements
 * the match can pass while the service still misbehaves, which is the one thing it exists to
 * prevent.
 */
export function isOffTopicReply(reply: string): boolean {
  const firstLine = reply.trim().split('\n', 1)[0].replace(EDGE_DECORATION, '')
  return OFF_TOPIC_SENTINEL.test(firstLine)
}

/**
 * Hard ceiling on how much text the gate will hold back before giving up and releasing.
 *
 * The bound is on the buffer's HEAD — the buffer with leading whitespace removed — not on the
 * raw buffer, and that distinction is load-bearing: `isOffTopicReply` calls `.trim()` before
 * looking at the first line, so `"\n\n   OFF_TOPIC"` is a refusal to the batch predicate at any
 * length of whitespace run. Capping the raw buffer would flush mid-run and let the sentinel
 * through on exactly the input the batch path refuses.
 *
 * 64 characters against a longest genuine candidate of decoration + 9-character token +
 * separator. The decoration shapes observed in this codebase's own doc comments (`**`, `"`,
 * `> **"`, `[`) run to a handful of characters, so 64 leaves roughly 55 characters of headroom.
 *
 * The accepted divergence: a reply opening with more than ~55 characters of unbroken markdown
 * decoration or whitespace before the sentinel would stream raw. No model emits that, and the
 * alternative — an unbounded buffer — means a reply whose first line is a whole paragraph shows
 * nothing until the paragraph finishes, which is the feature not working.
 */
export const SENTINEL_BUFFER_CHARS = 64

export type SentinelVerdict = 'refusal' | 'clear' | 'undecided'

/**
 * Decides, from the start of a reply, whether it is the refusal sentinel — WITHOUT waiting for
 * the whole reply.
 *
 * Three answers, and `undecided` is the only one that withholds text:
 *
 * - `refusal` — the buffer already contains a sentinel the batch predicate would match too.
 *   Every input that reaches this verdict mid-line also reaches it in `isOffTopicReply`: the
 *   leading strip is identical, and the trailing strip the batch does can only ever remove
 *   characters after a match that is anchored at the start.
 * - `clear`  — no prefix of any length can turn this into a sentinel. Release and stream on.
 * - `undecided` — the buffer is still a viable prefix (decoration only, a partial token, or the
 *   whole token with no separator yet). Hold.
 *
 * `ended` short-circuits to the batch predicate, so a stream that stops mid-token is judged
 * exactly as the non-streaming path would judge the same text.
 */
export function judgeSentinel(buffer: string, ended: boolean): SentinelVerdict {
  // Mirrors the `.trim()` in isOffTopicReply: leading whitespace — INCLUDING newlines — is not
  // the first line. Without this, a reply starting `\n\nOFF_TOPIC` would look like a completed
  // empty first line and release the sentinel.
  const head = buffer.replace(/^\s+/, '')
  const lineEnd = head.indexOf('\n')

  if (lineEnd !== -1 || ended || head.length >= SENTINEL_BUFFER_CHARS) {
    const firstLine = lineEnd === -1 ? head : head.slice(0, lineEnd)
    return isOffTopicReply(firstLine) ? 'refusal' : 'clear'
  }

  const stripped = head.replace(LEADING_DECORATION, '')
  if (PARTIAL_SENTINEL.test(stripped)) return 'refusal'

  const lower = stripped.toLowerCase()
  // Empty covers "nothing but decoration so far". The prefix test covers a token arriving one
  // character at a time. The trailing-whitespace test covers `OFF_TOPIC   ` still waiting to
  // learn whether a separator or a word follows.
  if (lower === '' || SENTINEL_TOKEN.startsWith(lower) || /^off_topic\s*$/i.test(stripped)) {
    return 'undecided'
  }

  return 'clear'
}

/**
 * Streaming buffer around `judgeSentinel`.
 *
 * Holds the opening of a reply until the refusal question is settled, then releases the buffer
 * VERBATIM — decoration, whitespace and all. The stripping above exists to reach a verdict, never
 * to rewrite the answer: a reply legitimately beginning `*emphasis*` must arrive as it was
 * written, and `judgeSentinel`'s internal trimming must not leak into what the student reads.
 */
export class SentinelGate {
  private buffer = ''
  private released = false
  private refused = false

  /**
   * Feeds one delta in. Returns the text that may now go to the client — empty while the gate is
   * still deciding, and empty forever once it has decided the reply is a refusal.
   */
  push(delta: string): string {
    if (this.refused) return ''
    if (this.released) return delta

    this.buffer += delta
    const verdict = judgeSentinel(this.buffer, false)
    if (verdict === 'undecided') return ''

    if (verdict === 'refusal') {
      this.refused = true
      this.buffer = ''
      return ''
    }

    this.released = true
    const held = this.buffer
    this.buffer = ''
    return held
  }

  /**
   * Settles an undecided gate at end of stream and returns whatever is still held. A stream that
   * ends on a bare `OFF_TOPIC` is a refusal — the batch predicate says so, and `push` could not
   * know it while more text might still arrive.
   */
  end(): string {
    if (this.refused || this.released) return ''
    if (judgeSentinel(this.buffer, true) === 'refusal') {
      this.refused = true
      this.buffer = ''
      return ''
    }
    this.released = true
    const held = this.buffer
    this.buffer = ''
    return held
  }

  /** True once the gate has ruled the reply a refusal. Nothing more will ever be released. */
  get isRefusal(): boolean {
    return this.refused
  }
}

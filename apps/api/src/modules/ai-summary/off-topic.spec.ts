import { isOffTopicReply, judgeSentinel, SENTINEL_BUFFER_CHARS, SentinelGate } from './off-topic'

/**
 * Feeds a reply through the gate the way a provider would — one delta at a time — and reports
 * everything an observer could see.
 *
 * `released` is the concatenation of what the gate let out, and the assertions below check that
 * string rather than the reply that went in. That is the point: a test that asserts on its own
 * input cannot notice the gate breaking.
 */
function drain(chunks: string[]): { released: string; parts: string[]; refusal: boolean } {
  const gate = new SentinelGate()
  const parts: string[] = []

  for (const chunk of chunks) {
    const out = gate.push(chunk)
    if (out) parts.push(out)
  }
  const tail = gate.end()
  if (tail) parts.push(tail)

  return { released: parts.join(''), parts, refusal: gate.isRefusal }
}

/** Character-by-character, the worst case for a buffer: every boundary is a decision point. */
function drainByChar(reply: string) {
  return drain([...reply])
}

describe('isOffTopicReply', () => {
  it.each([
    ['OFF_TOPIC'],
    ['off_topic'],
    ['OFF_TOPIC.'],
    ['OFF_TOPIC:'],
    ['**OFF_TOPIC**'],
    ['"OFF_TOPIC"'],
    ['OFF_TOPIC — this question is unrelated'],
    ['OFF_TOPIC\nThe document is about eigenvalues.'],
    ['\n\nOFF_TOPIC'],
  ])('treats %j as a refusal', (reply) => {
    expect(isOffTopicReply(reply)).toBe(true)
  })

  it.each([
    ['OFF_TOPIC is the marker returned when a question is unrelated.'],
    ['OFF_TOPICS are covered on page 4.'],
    ['This document does not cover that. It would be off-topic to guess.'],
    ['Eigenvalues are scalars.'],
  ])('answers %j rather than swallowing it', (reply) => {
    expect(isOffTopicReply(reply)).toBe(false)
  })
})

describe('judgeSentinel', () => {
  it('withholds judgement while the buffer is still a viable sentinel prefix', () => {
    for (const partial of ['', 'O', 'OF', 'OFF', 'OFF_', 'OFF_TOP', 'OFF_TOPIC', 'OFF_TOPIC  ']) {
      expect(judgeSentinel(partial, false)).toBe('undecided')
    }
  })

  it('withholds judgement while only decoration has arrived', () => {
    for (const partial of ['*', '**', '> **"', '  \n\n']) {
      expect(judgeSentinel(partial, false)).toBe('undecided')
    }
  })

  it('refuses as soon as the separator after the token arrives', () => {
    expect(judgeSentinel('OFF_TOPIC.', false)).toBe('refusal')
    expect(judgeSentinel('**OFF_TOPIC*', false)).toBe('refusal')
    expect(judgeSentinel('OFF_TOPIC —', false)).toBe('refusal')
  })

  it('clears as soon as a letter proves the token is being discussed, not signalled', () => {
    // The character that decides it is `i`: up to `OFF_TOPIC ` this is indistinguishable from
    // a refusal, and one more character settles it in favour of answering.
    expect(judgeSentinel('OFF_TOPIC ', false)).toBe('undecided')
    expect(judgeSentinel('OFF_TOPIC i', false)).toBe('clear')
  })

  it('clears immediately on ordinary prose, holding nothing back', () => {
    expect(judgeSentinel('E', false)).toBe('clear')
    expect(judgeSentinel('An eigenvalue', false)).toBe('clear')
    expect(judgeSentinel('*emphasis*', false)).toBe('clear')
  })

  it('settles an unfinished token at end of stream exactly as the batch predicate would', () => {
    // Mid-stream `OFF_TOPIC` is undecided; the same string with nothing following it is a
    // refusal, and both must agree with isOffTopicReply on the finished text.
    expect(judgeSentinel('OFF_TOPIC', false)).toBe('undecided')
    expect(judgeSentinel('OFF_TOPIC', true)).toBe('refusal')
    expect(isOffTopicReply('OFF_TOPIC')).toBe(true)
  })

  it('measures the cap against the trimmed head, not the raw buffer', () => {
    // The batch predicate trims first, so a run of leading whitespace longer than the cap is
    // still a refusal to it — and the gate must agree. Capping the RAW buffer instead flushes
    // on the whitespace alone, marks the gate released, and streams the sentinel that follows.
    // Delivered as separate deltas because that is when the two caps diverge.
    const whitespace = '\n'.repeat(SENTINEL_BUFFER_CHARS * 2)
    expect(judgeSentinel(whitespace, false)).toBe('undecided')

    const streamed = drain([whitespace, 'OFF_TOPIC'])
    expect(isOffTopicReply(`${whitespace}OFF_TOPIC`)).toBe(true)
    expect(streamed.refusal).toBe(true)
    expect(streamed.released).toBe('')
  })

  it('gives up and releases once the head exceeds the cap', () => {
    // The documented divergence: decoration longer than the budget streams raw rather than
    // buffering an unbounded prefix. Pinned so the bound is a decision, not an accident.
    const decorated = '*'.repeat(SENTINEL_BUFFER_CHARS + 1)
    expect(judgeSentinel(decorated, false)).toBe('clear')
  })
})

describe('SentinelGate', () => {
  it('never releases the sentinel, however the model decorates it', () => {
    // The stimulus is injected; the verdict and the released text are produced by the gate. A
    // test that asserted on the input string could not tell the gate from a passthrough.
    for (const reply of [
      'OFF_TOPIC',
      'off_topic',
      '**OFF_TOPIC**',
      '"OFF_TOPIC"',
      'OFF_TOPIC.',
      'OFF_TOPIC — unrelated to this document',
      'OFF_TOPIC\nThis document is about eigenvalues.',
      '\n\nOFF_TOPIC',
    ]) {
      const streamed = drainByChar(reply)
      expect(streamed.released).toBe('')
      expect(streamed.released).not.toContain('OFF_TOPIC')
      expect(streamed.refusal).toBe(true)
      // The batch path and the streamed path must agree on every one of these.
      expect(isOffTopicReply(reply)).toBe(true)
    }
  })

  it('releases an ordinary reply in full, byte for byte', () => {
    const reply = 'An eigenvalue is a scalar λ such that Av = λv. See **page 12**.'
    const streamed = drainByChar(reply)

    expect(streamed.released).toBe(reply)
    expect(streamed.refusal).toBe(false)
  })

  it('releases the buffer VERBATIM, decoration included', () => {
    // The stripping inside judgeSentinel is for reaching a verdict only. A reply opening with
    // markdown emphasis must arrive as the model wrote it — releasing `G` for `*G*` would
    // silently rewrite answers.
    expect(drainByChar('*Gauss* proved it.').released).toBe('*Gauss* proved it.')
    expect(drainByChar('  leading space kept').released).toBe('  leading space kept')
    expect(drainByChar('> quoted opening').released).toBe('> quoted opening')
  })

  it('answers a reply that merely discusses the sentinel', () => {
    const reply = 'OFF_TOPIC is the marker returned when a question is unrelated.'
    const streamed = drainByChar(reply)

    // Both halves matter: the reply is not swallowed, AND it is not truncated to hide the token.
    expect(streamed.refusal).toBe(false)
    expect(streamed.released).toBe(reply)
  })

  it('starts releasing before the first line is finished', () => {
    // The bound this pins is latency, not correctness: an unbounded gate that simply waited for
    // the newline would pass every assertion above while showing the student nothing until the
    // whole opening paragraph had been generated.
    const opening = 'Eigenvalues are scalars that describe how a transformation stretches a vector'
    const gate = new SentinelGate()
    const released = gate.push(opening[0])

    expect(released).toBe(opening[0])
  })

  it('holds no more than the cap before deciding', () => {
    const gate = new SentinelGate()
    let withheld = 0

    for (const char of '*'.repeat(SENTINEL_BUFFER_CHARS * 2)) {
      if (!gate.push(char)) withheld += 1
      else break
    }

    expect(withheld).toBeLessThanOrEqual(SENTINEL_BUFFER_CHARS)
  })

  it('releases nothing at all once it has ruled a refusal, even if the model keeps talking', () => {
    const gate = new SentinelGate()
    gate.push('OFF_TOPIC.')
    expect(gate.isRefusal).toBe(true)
    expect(gate.push(' The document covers eigenvalues.')).toBe('')
    expect(gate.end()).toBe('')
  })

  it('agrees with the batch predicate whatever the chunk boundaries are', () => {
    // A sentinel split across deltas is the realistic case — providers emit `OFF`, `_TOP`, `IC`
    // — and a gate that only looked at individual deltas would miss every one of them.
    const splits = [
      ['OFF', '_TOP', 'IC'],
      ['**OFF', '_TOPIC', '**'],
      ['OFF_TOPIC', ' —', ' unrelated'],
      ['\n', '\nOFF_TOPIC'],
    ]

    for (const chunks of splits) {
      const streamed = drain(chunks)
      expect(streamed.refusal).toBe(isOffTopicReply(chunks.join('')))
      expect(streamed.released).toBe('')
    }
  })
})

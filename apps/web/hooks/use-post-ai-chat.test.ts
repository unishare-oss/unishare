import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePostAiChat } from './use-post-ai-chat'

/**
 * The hook drives the SSE endpoint directly — an event-stream endpoint generates nothing useful
 * through Orval — so `fetch` is what these tests replace. That is deliberate: mocking a transport
 * helper instead would mean the frame parsing, the citation narrowing and the refusal handling
 * were all injected rather than exercised, and every one of them is a place this feature has
 * already been got wrong once.
 */

type Frame = Record<string, unknown>

/** A fetch that answers with the given SSE events, delivered one network chunk each. */
function streams(events: Frame[], { chunks }: { chunks?: string[] } = {}) {
  const encoder = new TextEncoder()
  const slices = chunks ?? events.map((event) => `data: ${JSON.stringify(event)}\n\n`)
  let index = 0

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () =>
            index < slices.length
              ? { done: false, value: encoder.encode(slices[index++]) }
              : { done: true, value: undefined },
          cancel: async () => undefined,
        }),
      },
    })),
  )
}

/** A fetch that fails before the stream opens, the way a 403 or 503 arrives. */
function rejects(status: number, message = 'nope') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status,
      json: async () => ({ success: false, message }),
    })),
  )
}

const citation = {
  chunkId: 'c1',
  pageNum: 12,
  snippet: 'Eigenvalues…',
  fileId: 'f1',
  fileName: 'notes.pdf',
}

async function send(
  hook: { current: { sendMessage: (text: string) => Promise<void> } },
  text: string,
) {
  await act(async () => {
    await hook.current.sendMessage(text)
  })
}

describe('usePostAiChat', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('attaches citations from the stream to the assistant message', async () => {
    streams([
      { type: 'citations', citations: [citation] },
      { type: 'delta', text: 'See page 12.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'What is an eigenvalue?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toBe('See page 12.')
    expect(result.current.messages[1].role).toBe('assistant')
    // fileId/fileName ride along: a page number without its document is ambiguous on a
    // multi-file post, and the footer groups by fileId.
    expect(result.current.messages[1].citations).toEqual([citation])
  })

  it('assembles a reply from its deltas in order', async () => {
    streams([
      { type: 'citations', citations: [] },
      { type: 'delta', text: 'An eigenvalue ' },
      { type: 'delta', text: 'is a ' },
      { type: 'delta', text: 'scalar.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'What is an eigenvalue?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toBe('An eigenvalue is a scalar.')
  })

  it('updates the assistant message in place rather than appending one per delta', async () => {
    streams([
      { type: 'delta', text: 'one ' },
      { type: 'delta', text: 'two ' },
      { type: 'delta', text: 'three' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'count')

    // One user turn, one assistant turn — three bubbles would mean the message was appended
    // per delta, which reads as three separate answers.
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toBe('one two three')
  })

  it('reassembles events split across network chunks', async () => {
    // A frame is not guaranteed to arrive whole. Parsing per chunk drops the halves.
    streams([], {
      chunks: [
        'data: {"type":"delta","text":"An eigen',
        'value is a scalar."}\n\ndata: {"type":"done","offTopic":false}\n\n',
      ],
    })

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'q')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toBe('An eigenvalue is a scalar.')
  })

  it('does not fall into the error branch on a well-formed stream', async () => {
    streams([
      { type: 'delta', text: 'Chapter 2 covers it.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'where?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).not.toContain('Something went wrong')
  })

  it('shows the friendly off-topic copy and no citations', async () => {
    // What the server actually sends for a refusal: no deltas at all, no citations event, and
    // `done` carrying the verdict. The sentinel text itself never crosses the wire.
    streams([{ type: 'done', offTopic: true }])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'Who won the World Cup?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].offTopic).toBe(true)
    expect(result.current.messages[1].content).toContain(
      'only answer questions about this document',
    )
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('never leaks the raw OFF_TOPIC sentinel into the message content', async () => {
    // A server whose gate regressed and streamed the token as ordinary text. The flag is absent,
    // so only the content check can catch it.
    streams([
      { type: 'delta', text: 'OFF_TOPIC' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'Who won the World Cup?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).not.toContain('OFF_TOPIC')
    expect(result.current.messages[1].content).toContain(
      'only answer questions about this document',
    )
  })

  it('drops citations on an off-topic reply even if the server sends some', async () => {
    // The server contract says a refusal has no citations event at all, but the UI must not
    // depend on that: sources under a refusal read as evidence for a statement that has none.
    streams([
      { type: 'citations', citations: [citation] },
      { type: 'done', offTopic: true },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'Who won the World Cup?')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('does not carry citations over from a previous turn', async () => {
    streams([
      { type: 'citations', citations: [citation] },
      { type: 'delta', text: 'Page 12 covers it.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'What is an eigenvalue?')
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    streams([{ type: 'done', offTopic: true }])
    await send(result, 'Who won the World Cup?')

    await waitFor(() => expect(result.current.messages).toHaveLength(4))
    expect(result.current.messages[1].citations).toHaveLength(1)
    expect(result.current.messages[3].citations).toEqual([])
  })

  it('tolerates a stream with no citations event', async () => {
    streams([
      { type: 'delta', text: 'Hi.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'hi')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('normalises a non-numeric pageNum to null rather than passing it through', async () => {
    // `pageNum` is typed `number | null`, but the type describes the contract, not the payload
    // that actually arrives — an omitted field compiles fine and is not a page. Anything
    // non-numeric must become null rather than reaching the UI as a page label.
    streams([
      {
        type: 'citations',
        citations: [
          { chunkId: 'c1', pageNum: null, snippet: 'a' },
          { chunkId: 'c2', snippet: 'b' },
          { chunkId: 'c3', pageNum: 7, snippet: 'c', fileId: 'f9', fileName: 'ok.pdf' },
        ],
      },
      { type: 'delta', text: 'From the document.' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'summarise')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    // fileId/fileName are narrowed the same way and for a sharper reason: a citation grouped
    // under `undefined` would merge two different documents into one chip in the footer.
    expect(result.current.messages[1].citations).toEqual([
      { chunkId: 'c1', pageNum: null, snippet: 'a', fileId: '', fileName: '' },
      { chunkId: 'c2', pageNum: null, snippet: 'b', fileId: '', fileName: '' },
      { chunkId: 'c3', pageNum: 7, snippet: 'c', fileId: 'f9', fileName: 'ok.pdf' },
    ])
  })

  it('gives the failure message an empty citation list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('boom')
      }),
    )

    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'hi')

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toContain('Something went wrong')
    expect(result.current.messages[1].citations).toEqual([])
  })

  describe('failures are distinguished rather than collapsed', () => {
    // Every failure used to render the same opaque string, so a student could not tell a
    // switched-off feature from a broken server, and a response-shape mismatch — which throws in
    // the try block, not the request — was indistinguishable from either.
    it.each([
      [503, /unavailable right now/i, 'the AI provider is not configured — an expected state'],
      [403, /published and approved/i, 'an author asking on their own unapproved draft'],
    ])('renders a specific message for %i (%s)', async (status, pattern) => {
      rejects(status)

      const { result } = renderHook(() => usePostAiChat('p1'))
      await send(result, 'hi')

      await waitFor(() => expect(result.current.messages).toHaveLength(2))
      expect(result.current.messages[1].content).toMatch(pattern)
      // The generic message must NOT also appear — that would mean the branch was skipped and
      // the assertion above happened to match a substring of the fallback.
      expect(result.current.messages[1].content).not.toContain('Something went wrong')
    })

    it('falls back to the generic message for an unrecognised status', async () => {
      rejects(500, 'kaboom')

      const { result } = renderHook(() => usePostAiChat('p1'))
      await send(result, 'hi')

      await waitFor(() => expect(result.current.messages).toHaveLength(2))
      expect(result.current.messages[1].content).toContain('Something went wrong')
    })

    it.each([
      [503, /unavailable right now/i],
      [403, /published and approved/i],
      [500, /Something went wrong/],
    ])('maps a mid-stream error event with status %i the same way', async (status, pattern) => {
      // A failure after the first token carries its status in the event rather than the status
      // line, and must produce identical copy — the student's situation is the same.
      streams([
        { type: 'delta', text: 'An eigenvalue ' },
        { type: 'error', status, message: 'server side detail' },
      ])

      const { result } = renderHook(() => usePostAiChat('p1'))
      await send(result, 'hi')

      await waitFor(() => expect(result.current.messages).toHaveLength(2))
      expect(result.current.messages[1].content).toMatch(pattern)
    })

    it('replaces the partial answer instead of leaving it under the error', async () => {
      // Half an answer with an apology beneath it reads as a complete answer to anyone who does
      // not scroll, and the half that arrived was never checked against the rest of the reply.
      streams([
        { type: 'citations', citations: [citation] },
        { type: 'delta', text: 'An eigenvalue is a scalar that' },
        { type: 'error', status: 503, message: 'busy' },
      ])

      const { result } = renderHook(() => usePostAiChat('p1'))
      await send(result, 'hi')

      await waitFor(() => expect(result.current.messages).toHaveLength(2))
      expect(result.current.messages[1].content).not.toContain('An eigenvalue')
      expect(result.current.messages[1].citations).toEqual([])
    })
  })

  it('reports pending only while a turn is in flight', async () => {
    streams([
      { type: 'delta', text: 'done' },
      { type: 'done', offTopic: false },
    ])

    const { result } = renderHook(() => usePostAiChat('p1'))
    expect(result.current.isPending).toBe(false)

    await send(result, 'hi')

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.messages).toHaveLength(2)
  })

  it('sends the whole conversation, including the new question', async () => {
    streams([
      { type: 'delta', text: 'first answer' },
      { type: 'done', offTopic: false },
    ])
    const { result } = renderHook(() => usePostAiChat('p1'))
    await send(result, 'first question')
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    streams([
      { type: 'delta', text: 'second answer' },
      { type: 'done', offTopic: false },
    ])
    await send(result, 'second question')
    await waitFor(() => expect(result.current.messages).toHaveLength(4))

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/posts/p1/ai-chat/stream')
    // The assistant's turn has to be in the history or the server cannot resolve "what about
    // the second one?" — condensation is what that history is for.
    expect(JSON.parse(request.body as string).messages).toEqual([
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'first answer' },
      { role: 'user', content: 'second question' },
    ])
  })
})

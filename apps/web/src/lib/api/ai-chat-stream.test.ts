import { describe, expect, it, vi, afterEach } from 'vitest'
import { parseSseFrames, streamPostAiChat, type AiChatStreamEvent } from './ai-chat-stream'
import { ApiError } from './fetcher'

/** Answers the fetch with the given byte slices, exactly as the network would deliver them. */
function respondsWith(slices: Uint8Array[]) {
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
              ? { done: false, value: slices[index++] }
              : { done: true, value: undefined },
          cancel: async () => undefined,
        }),
      },
    })),
  )
}

async function collect(postId = 'p1'): Promise<AiChatStreamEvent[]> {
  const events: AiChatStreamEvent[] = []
  for await (const event of streamPostAiChat(postId, [{ role: 'user', content: 'q' }])) {
    events.push(event)
  }
  return events
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseSseFrames', () => {
  it('returns complete frames and keeps the partial one back', () => {
    const { events, rest } = parseSseFrames(
      'data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","te',
    )

    expect(events).toEqual([{ type: 'delta', text: 'a' }])
    expect(rest).toBe('data: {"type":"delta","te')
  })

  it('tolerates CRLF line endings', () => {
    // Permitted by the SSE spec and inserted by some proxies. A parser that only splits on \n\n
    // never sees a frame boundary and the whole reply silently never arrives.
    const { events } = parseSseFrames('data: {"type":"done","offTopic":false}\r\n\r\n')

    expect(events).toEqual([{ type: 'done', offTopic: false }])
  })

  it('ignores comment and retry lines rather than treating them as payload', () => {
    const { events } = parseSseFrames(': keep-alive\n\ndata: {"type":"delta","text":"x"}\n\n')

    expect(events).toEqual([{ type: 'delta', text: 'x' }])
  })

  it('skips a frame it cannot parse instead of failing the turn', () => {
    const { events } = parseSseFrames('data: not json\n\ndata: {"type":"done","offTopic":true}\n\n')

    expect(events).toEqual([{ type: 'done', offTopic: true }])
  })
})

describe('streamPostAiChat', () => {
  it('decodes a multi-byte character split across two network reads', async () => {
    // The em dash is three bytes and appears in the server's own refusal and truncation copy.
    // Decoding each read on its own turns a split one into replacement characters.
    const bytes = new TextEncoder().encode('data: {"type":"delta","text":"—"}\n\n')
    respondsWith([bytes.slice(0, 30), bytes.slice(30)])

    expect(await collect()).toEqual([{ type: 'delta', text: '—' }])
  })

  it('delivers several frames arriving in one read', async () => {
    const encoder = new TextEncoder()
    respondsWith([
      encoder.encode(
        'data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","text":"b"}\n\ndata: {"type":"done","offTopic":false}\n\n',
      ),
    ])

    expect(await collect()).toEqual([
      { type: 'delta', text: 'a' },
      { type: 'delta', text: 'b' },
      { type: 'done', offTopic: false },
    ])
  })

  it('raises an error event as an ApiError carrying its status', async () => {
    // Thrown rather than yielded so a caller has ONE failure path: a mid-stream 503 and a 503
    // status line must be indistinguishable to the code that renders the message.
    const encoder = new TextEncoder()
    respondsWith([
      encoder.encode('data: {"type":"delta","text":"partial"}\n\n'),
      encoder.encode('data: {"type":"error","status":503,"message":"busy"}\n\n'),
    ])

    const error = await collect().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 503, message: 'busy' })
  })

  it('raises a failed response as an ApiError with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ success: false, message: 'Post is not available' }),
      })),
    )

    await expect(collect()).rejects.toMatchObject({
      status: 403,
      message: 'Post is not available',
    })
  })

  it('keeps the status when the failure body is not JSON', async () => {
    // A proxy 502 has an HTML body. Losing the status to a parse error would render the wrong
    // explanation for a very ordinary failure.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json')
        },
      })),
    )

    await expect(collect()).rejects.toMatchObject({ status: 502 })
  })

  it('posts the conversation to the streaming endpoint asking for an event stream', async () => {
    respondsWith([new TextEncoder().encode('data: {"type":"done","offTopic":false}\n\n')])
    await collect('post-9')

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/posts/post-9/ai-chat/stream')
    expect(init.method).toBe('POST')
    // Also what makes ResponseInterceptor leave the frames unwrapped.
    expect((init.headers as Record<string, string>).Accept).toBe('text/event-stream')
    expect(init.credentials).toBe('include')
  })
})

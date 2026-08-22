import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common'
import { Response } from 'express'
import { PostsController } from './posts.controller'
import { PostsService } from './posts.service'
import { TrendingService } from '@/modules/trending/trending.service'
import { AiChatStreamEvent } from '../ai-summary/ai-summary.service'
import { AiChatDto } from './dto/ai-chat.dto'

/**
 * The SSE half of AI chat: what actually goes down the wire, and — just as important — WHEN the
 * status line is committed.
 */

/** A minimal express Response that records everything the handler does to it. */
function fakeResponse() {
  const writes: string[] = []
  const headers: Record<string, unknown> = {}
  let closeHandler: (() => void) | undefined

  const res = {
    writeHead: jest.fn((status: number, sent: Record<string, string>) => {
      headers.status = status
      Object.assign(headers, sent)
      return res
    }),
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => {
      writes.push(chunk)
      return true
    }),
    end: jest.fn(),
    on: jest.fn((event: string, handler: () => void) => {
      if (event === 'close') closeHandler = handler
      return res
    }),
  }

  return {
    res: res as unknown as Response,
    writes,
    headers,
    /** Simulates the browser going away mid-stream. */
    disconnect: () => closeHandler?.(),
    /** The parsed payload of every frame written, in order. */
    events: () =>
      writes
        .filter((chunk) => chunk.startsWith('data: '))
        .map((chunk) => JSON.parse(chunk.slice(6, chunk.indexOf('\n\n')))),
  }
}

const session = { user: { id: 'u1' } } as never
const dto: AiChatDto = { messages: [{ role: 'user', content: 'What is an eigenvalue?' }] }

describe('PostsController AI chat stream', () => {
  let controller: PostsController
  let postsService: { chatWithPostStream: jest.Mock }

  beforeEach(() => {
    postsService = { chatWithPostStream: jest.fn() }
    controller = new PostsController(postsService as unknown as PostsService, {} as TrendingService)
    jest.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined)
  })

  /** Makes the service return a stream of the given events. */
  function serviceStreams(events: AiChatStreamEvent[], onReturn?: () => void) {
    postsService.chatWithPostStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        try {
          for (const event of events) yield event
        } finally {
          onReturn?.()
        }
      },
    })
  }

  it('writes every event as its own SSE frame and closes the response', async () => {
    serviceStreams([
      { type: 'citations', citations: [] },
      { type: 'delta', text: 'An eigenvalue ' },
      { type: 'delta', text: 'is a scalar.' },
      { type: 'done', offTopic: false },
    ])

    const http = fakeResponse()
    await controller.aiChatStream('p1', dto, session, http.res)

    expect(http.events()).toEqual([
      { type: 'citations', citations: [] },
      { type: 'delta', text: 'An eigenvalue ' },
      { type: 'delta', text: 'is a scalar.' },
      { type: 'done', offTopic: false },
    ])
    // Every frame ends with the blank line that terminates it — without it a client sees one
    // frame that never completes.
    for (const chunk of http.writes) expect(chunk.endsWith('\n\n')).toBe(true)
    expect(http.res.end).toHaveBeenCalled()
  })

  it('sends the event-stream headers', async () => {
    serviceStreams([{ type: 'done', offTopic: false }])

    const http = fakeResponse()
    await controller.aiChatStream('p1', dto, session, http.res)

    expect(http.headers.status).toBe(200)
    expect(http.headers['Content-Type']).toBe('text/event-stream')
    // Set because an nginx ingress otherwise buffers the whole response and streaming silently
    // becomes a slow one-shot request.
    expect(http.headers['X-Accel-Buffering']).toBe('no')
  })

  it('never writes a byte on a failure that happens before the first event', async () => {
    // This is what keeps 403 and 503 REAL status codes: once headers are out, the response is
    // committed to 200 and the frontend's error copy has nothing to key on.
    postsService.chatWithPostStream.mockRejectedValue(
      new ForbiddenException('Post is not available'),
    )

    const http = fakeResponse()
    await expect(controller.aiChatStream('p1', dto, session, http.res)).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    expect(http.res.writeHead).not.toHaveBeenCalled()
    expect(http.res.write).not.toHaveBeenCalled()
  })

  it('lets a provider failure before the first token stay a 503', async () => {
    postsService.chatWithPostStream.mockResolvedValue({
      // eslint-disable-next-line require-yield
      async *[Symbol.asyncIterator]() {
        throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
      },
    })

    const http = fakeResponse()
    await expect(controller.aiChatStream('p1', dto, session, http.res)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(http.res.writeHead).not.toHaveBeenCalled()
  })

  it('turns a mid-stream failure into an error event carrying its status', async () => {
    // The failure this exists for: a 429 fifty tokens in leaving a half-written answer on screen
    // with nothing to explain why it stopped. The status rides along so the client renders the
    // same "unavailable" copy it would for a 503 status line.
    postsService.chatWithPostStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'delta', text: 'An eigenvalue ' } as AiChatStreamEvent
        throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
      },
    })

    const http = fakeResponse()
    await controller.aiChatStream('p1', dto, session, http.res)

    const events = http.events()
    expect(events.at(-1)).toEqual({
      type: 'error',
      status: 503,
      message: 'The AI service is busy. Please try again shortly.',
    })
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(http.res.end).toHaveBeenCalled()
  })

  it('does not leak an unexpected error message to the client', async () => {
    postsService.chatWithPostStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'delta', text: 'partial' } as AiChatStreamEvent
        throw new Error('connect ECONNREFUSED 10.0.0.4:5432')
      },
    })

    const http = fakeResponse()
    await controller.aiChatStream('p1', dto, session, http.res)

    const last = http.events().at(-1) as { type: string; status: number; message: string }
    expect(last.type).toBe('error')
    expect(last.status).toBe(500)
    expect(last.message).not.toContain('ECONNREFUSED')
  })

  it('stops generating when the client disconnects', async () => {
    const closed = jest.fn()
    const http = fakeResponse()

    postsService.chatWithPostStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        try {
          for (let i = 0; i < 100; i += 1) {
            yield { type: 'delta', text: `${i} ` } as AiChatStreamEvent
            // The browser goes away part-way through, which is the ordinary case: a student
            // reads enough of the answer and navigates on.
            if (i === 2) http.disconnect()
          }
        } finally {
          closed()
        }
      },
    })

    await controller.aiChatStream('p1', dto, session, http.res)

    // The generator's cleanup ran, which is what aborts the provider request rather than letting
    // it keep spending tokens on a closed tab.
    expect(closed).toHaveBeenCalled()
    expect(http.events().length).toBeLessThan(100)
  })
})

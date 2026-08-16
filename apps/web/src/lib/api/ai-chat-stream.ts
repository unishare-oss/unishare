import type { AiChatCitationDto } from '@/src/lib/api/generated/unishareAPI.schemas'
import { ApiError } from '@/src/lib/api/fetcher'

/**
 * The AI chat stream, spoken directly rather than through a generated hook.
 *
 * Orval generates nothing useful for a server-sent-event endpoint — the server marks it
 * `@ApiExcludeEndpoint`, so it is not in openapi.json at all — and this is the deliberate
 * consequence: one hand-written transport, kept next to the generated client it sits beside, that
 * turns SSE frames back into the same values the one-shot endpoint returns.
 *
 * Failures are raised as `ApiError` with the server's status, exactly as `customFetch` raises
 * them, so callers keep one error path: a 503 from a switched-off provider looks the same whether
 * it arrived as a status line or as a mid-stream `error` event.
 */

/** Mirrors `AiChatStreamEvent` in apps/api/src/modules/ai-summary/ai-summary.service.ts. */
export type AiChatStreamEvent =
  | { type: 'citations'; citations: AiChatCitationDto[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; offTopic: boolean }
  | { type: 'error'; status: number; message: string }

export interface AiChatStreamMessage {
  role: 'user' | 'assistant'
  content: string
}

const GENERIC_FAILURE = 'An error occurred'

/**
 * Reads the error envelope off a non-200 response.
 *
 * `HttpExceptionFilter` always sends `{ success, message, error, ... }`, but a stream can also be
 * refused by something in front of the API — a proxy 502, a 413 — whose body is not JSON at all.
 * The status is what the caller keys on, so an unreadable body degrades the message rather than
 * replacing the status with a parse failure.
 */
async function errorFromResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { message?: string }
    return new ApiError(body?.message ?? GENERIC_FAILURE, response.status)
  } catch {
    return new ApiError(GENERIC_FAILURE, response.status)
  }
}

/**
 * Splits a decoded SSE body into frames.
 *
 * Kept separate from the network so the parsing rules are testable on their own: frames end at a
 * blank line, `\r\n` is tolerated because SSE permits it, and only `data:` lines carry payload.
 * Returns the events found plus the unconsumed remainder, which is the half-frame that has to
 * wait for the next network chunk.
 */
export function parseSseFrames(buffered: string): {
  events: AiChatStreamEvent[]
  rest: string
} {
  const normalised = buffered.replace(/\r\n/g, '\n')
  const frames = normalised.split('\n\n')
  // The final element is whatever followed the last blank line — an incomplete frame, or an
  // empty string when the chunk happened to end on a boundary.
  const rest = frames.pop() ?? ''

  const events: AiChatStreamEvent[] = []
  for (const frame of frames) {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')
    if (!data) continue

    try {
      events.push(JSON.parse(data) as AiChatStreamEvent)
    } catch {
      // A frame we cannot parse is not worth destroying a good answer over; the terminal `done`
      // or `error` event is what the caller waits on.
    }
  }

  return { events, rest }
}

/**
 * Streams one AI chat turn.
 *
 * Yields `citations`, then `delta`s, then `done`. An `error` event is thrown as an `ApiError`
 * rather than yielded, so a mid-stream failure lands in the caller's `catch` alongside a failure
 * that happened before the first byte — the caller must not have to handle "it broke" twice.
 */
export async function* streamPostAiChat(
  postId: string,
  messages: AiChatStreamMessage[],
  signal?: AbortSignal,
  // The `error` variant is deliberately absent from what this yields: it is THROWN, and the
  // return type is where that contract is enforced rather than merely documented.
): AsyncGenerator<Exclude<AiChatStreamEvent, { type: 'error' }>> {
  const response = await fetch(`/api/posts/${postId}/ai-chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // Also what tells ResponseInterceptor to leave the body unwrapped.
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) throw await errorFromResponse(response)
  if (!response.body) throw new ApiError(GENERIC_FAILURE, response.status)

  const reader = response.body.getReader()
  // `{ stream: true }` matters: a multi-byte character split across two network chunks decodes to
  // a replacement character without it, and reply text is routinely non-ASCII (— and … are in the
  // server's own copy).
  const decoder = new TextDecoder()
  let buffered = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffered += decoder.decode(value, { stream: true })
      const { events, rest } = parseSseFrames(buffered)
      buffered = rest

      for (const event of events) {
        if (event.type === 'error') {
          throw new ApiError(event.message || GENERIC_FAILURE, event.status)
        }
        yield event
      }
    }
  } finally {
    // Runs when the consumer stops early too — closing the tab or aborting must not leave the
    // response half-read and the connection open.
    await reader.cancel().catch(() => undefined)
  }
}

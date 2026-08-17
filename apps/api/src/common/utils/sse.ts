/**
 * Server-sent-event framing for the handlers that write SSE by hand.
 *
 * `@Sse()` covers the GET case (see notifications.controller.ts) and does this internally. A POST
 * cannot use it — EventSource only issues GETs, and the AI chat request body carries the whole
 * conversation — so the AI chat stream writes its own frames and shares this one formatter rather
 * than assembling `data:` lines at the call site.
 */

/**
 * One event, as a complete frame.
 *
 * The payload is always a single `data:` line: `JSON.stringify` escapes newlines, so no value can
 * split the frame or terminate it early. Everything the client needs to route the event is inside
 * that JSON, so there is one parser on the other side rather than one per event name.
 */
export function formatSseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

/** The headers an SSE response must carry, including the one that defeats nginx's proxy buffer. */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Without this an nginx ingress buffers the whole response and delivers it in one piece at the
  // end — the stream still "works", and streaming does nothing at all.
  'X-Accel-Buffering': 'no',
} as const

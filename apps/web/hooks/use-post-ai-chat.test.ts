import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mutateAsync = vi.fn()

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerAiChat: () => ({ mutateAsync, isPending: false }),
}))

import { usePostAiChat } from './use-post-ai-chat'

/**
 * `customFetch` unwraps the `{ success, message, data }` envelope exactly once, so the mutation
 * resolves to `{ data: AiChatResponseDto, status, headers }`. Every mock here is shaped that way
 * on purpose: an implementation that reaches for `result.data.data` throws, lands in the catch
 * branch, and the content assertions below fail. A near-identical double unwrap shipped in
 * `use-ai-index-status.ts` because no test pinned the level.
 */
function envelope(payload: unknown) {
  return { data: payload, status: 200, headers: new Headers() }
}

describe('usePostAiChat', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
  })

  it('attaches citations from the response to the assistant message', async () => {
    mutateAsync.mockResolvedValue(
      envelope({
        reply: 'See page 12.',
        offTopic: false,
        citations: [{ chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues…' }],
      }),
    )

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('What is an eigenvalue?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    // Pins the unwrap level: `result.data.data` would throw and yield the error copy instead.
    expect(result.current.messages[1].content).toBe('See page 12.')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].citations).toEqual([
      { chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues…' },
    ])
  })

  it('does not fall into the error branch on a well-formed response', async () => {
    mutateAsync.mockResolvedValue(envelope({ reply: 'Chapter 2 covers it.', offTopic: false }))

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('where?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).not.toContain('Something went wrong')
  })

  it('shows the friendly off-topic copy and no citations', async () => {
    mutateAsync.mockResolvedValue(envelope({ reply: 'OFF_TOPIC', offTopic: true, citations: [] }))

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('Who won the World Cup?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].offTopic).toBe(true)
    expect(result.current.messages[1].content).toContain(
      'only answer questions about this document',
    )
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('never leaks the raw OFF_TOPIC sentinel into the message content', async () => {
    mutateAsync.mockResolvedValue(envelope({ reply: 'OFF_TOPIC', offTopic: true, citations: [] }))

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('Who won the World Cup?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).not.toContain('OFF_TOPIC')
  })

  it('drops citations on an off-topic reply even if the server sends some', async () => {
    // The server contract says citations are empty here, but the UI must not depend on that:
    // attaching sources to a refusal reads as evidence for a statement that has none.
    mutateAsync.mockResolvedValue(
      envelope({
        reply: 'OFF_TOPIC',
        offTopic: true,
        citations: [{ chunkId: 'c9', pageNum: 4, snippet: 'unrelated' }],
      }),
    )

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('Who won the World Cup?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('does not carry citations over from a previous turn', async () => {
    mutateAsync.mockResolvedValueOnce(
      envelope({
        reply: 'Page 12 covers it.',
        offTopic: false,
        citations: [{ chunkId: 'c1', pageNum: 12, snippet: 'Eigenvalues…' }],
      }),
    )
    mutateAsync.mockResolvedValueOnce(
      envelope({ reply: 'OFF_TOPIC', offTopic: true, citations: [] }),
    )

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('What is an eigenvalue?')
    })
    await act(async () => {
      await result.current.sendMessage('Who won the World Cup?')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(4))
    expect(result.current.messages[1].citations).toHaveLength(1)
    expect(result.current.messages[3].citations).toEqual([])
  })

  it('tolerates a response with no citations field', async () => {
    mutateAsync.mockResolvedValue(envelope({ reply: 'Hi.', offTopic: false }))

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('hi')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].citations).toEqual([])
  })

  it('normalises a non-numeric pageNum to null rather than passing it through', async () => {
    // The generated type for `pageNum` is `{ [key: string]: unknown } | null` — the API DTO's
    // `@ApiProperty({ nullable: true })` carries no `type: Number`, so Swagger emits an untyped
    // nullable. Anything that is not a number must become null, never a rendered page label.
    mutateAsync.mockResolvedValue(
      envelope({
        reply: 'From the document.',
        offTopic: false,
        citations: [
          { chunkId: 'c1', pageNum: null, snippet: 'a' },
          { chunkId: 'c2', pageNum: undefined, snippet: 'b' },
          { chunkId: 'c3', pageNum: 7, snippet: 'c' },
        ],
      }),
    )

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('summarise')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].citations).toEqual([
      { chunkId: 'c1', pageNum: null, snippet: 'a' },
      { chunkId: 'c2', pageNum: null, snippet: 'b' },
      { chunkId: 'c3', pageNum: 7, snippet: 'c' },
    ])
  })

  it('gives the failure message an empty citation list', async () => {
    mutateAsync.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => {
      await result.current.sendMessage('hi')
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1].content).toContain('Something went wrong')
    expect(result.current.messages[1].citations).toEqual([])
  })
})

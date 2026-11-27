import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePostAiChat } from './use-post-ai-chat'

type Frame = Record<string, unknown>

/** A fetch that answers every call with the given SSE events. */
function streams(events: Frame[]) {
  const encoder = new TextEncoder()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      let index = 0
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () =>
              index < events.length
                ? {
                    done: false,
                    value: encoder.encode(`data: ${JSON.stringify(events[index++])}\n\n`),
                  }
                : { done: true, value: undefined },
            cancel: async () => undefined,
          }),
        },
      }
    }),
  )
}

const reply = (text: string): Frame[] => [
  { type: 'citations', citations: [] },
  { type: 'delta', text },
  { type: 'done', offTopic: false },
]

describe('usePostAiChat regenerate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('asks the last question again and swaps in the new answer', async () => {
    streams(reply('First answer.'))
    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => result.current.sendMessage('What is a norm?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    streams(reply('Second answer.'))
    await act(async () => result.current.regenerate())

    await waitFor(() => expect(result.current.messages[1]?.content).toBe('Second answer.'))
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'What is a norm?' })
  })

  it('keeps the earlier turns and sends them with the repeated question', async () => {
    streams(reply('Answer one.'))
    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => result.current.sendMessage('First?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    await act(async () => result.current.sendMessage('Second?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(4))

    streams(reply('Answer two, again.'))
    await act(async () => result.current.regenerate())

    await waitFor(() => expect(result.current.messages[3]?.content).toBe('Answer two, again.'))
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages.map((m: { content: string }) => m.content)).toEqual([
      'First?',
      'Answer one.',
      'Second?',
    ])
  })

  it('turns an error reply into a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ message: 'boom' }) })),
    )
    const { result } = renderHook(() => usePostAiChat('p1'))
    await act(async () => result.current.sendMessage('What is a norm?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    streams(reply('Worked this time.'))
    await act(async () => result.current.regenerate())

    await waitFor(() => expect(result.current.messages[1]?.content).toBe('Worked this time.'))
  })

  it('does nothing when there is no answer to replace', async () => {
    streams(reply('x'))
    const { result } = renderHook(() => usePostAiChat('p1'))

    await act(async () => result.current.regenerate())

    expect(result.current.messages).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})

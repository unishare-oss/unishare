import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSuggestedQuestions } from '@/hooks/use-suggested-questions'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/fetcher', () => ({ customFetch: fetchMock }))

describe('useSuggestedQuestions', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('asks for nothing until the panel is open', () => {
    renderHook(() => useSuggestedQuestions('p1', false))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns the questions the server wrote once enabled', async () => {
    fetchMock.mockResolvedValue({ data: { questions: ['What is a norm?'] } })

    const { result } = renderHook(() => useSuggestedQuestions('p1', true))

    await waitFor(() => expect(result.current).toEqual(['What is a norm?']))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/p1/ai-chat/suggestions')
  })

  it('does not ask again once it has an answer', async () => {
    fetchMock.mockResolvedValue({ data: { questions: ['What is a norm?'] } })
    const { result, rerender } = renderHook(({ on }) => useSuggestedQuestions('p1', on), {
      initialProps: { on: true },
    })
    await waitFor(() => expect(result.current).toHaveLength(1))

    rerender({ on: false })
    rerender({ on: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stays empty when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useSuggestedQuestions('p1', true))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(result.current).toEqual([])
  })

  it('ignores anything that is not a list of strings', async () => {
    fetchMock.mockResolvedValue({ data: { questions: ['Fine question?', 3, null] } })

    const { result } = renderHook(() => useSuggestedQuestions('p1', true))

    await waitFor(() => expect(result.current).toEqual(['Fine question?']))
  })
})

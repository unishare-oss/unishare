'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { A2uiMessage } from '@/components/a2ui/a2ui-surfaces'
import type { PracticeQuizAnswer } from '@/lib/practice-quiz/check-answer'
import { ApiError, customFetch } from '@/src/lib/api/fetcher'

/** Mirrors `PracticeQuiz` in apps/api/src/modules/ai-summary/practice-quiz-surface.ts. */
export interface PracticeQuiz {
  messages: A2uiMessage[]
  answers: PracticeQuizAnswer[]
}

const ERROR_MESSAGE = 'Something went wrong. Please try again.'

function errorMessageFor(error: unknown): string {
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 503) return 'Practice questions are unavailable right now. Please try again later.'
  if (status === 403)
    return 'Practice questions are available once this post is published and approved.'
  if (status === 400) return 'This post needs an AI summary before it can be turned into questions.'
  return ERROR_MESSAGE
}

/**
 * Asks the server for practice questions about a post.
 *
 * `quiz` changes on every successful request and `round` counts them, so the caller can give the
 * surface a new key and start it from a clean data model instead of carrying over what the
 * student picked last time.
 */
export function usePracticeQuiz(postId: string) {
  const [quiz, setQuiz] = useState<PracticeQuiz | null>(null)
  const [round, setRound] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // A request in flight when the panel unmounts has nowhere to put its answer.
  useEffect(() => () => abortRef.current?.abort(), [])

  const start = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setError(null)

    try {
      const response = await customFetch<{ data: PracticeQuiz }>(
        `/api/posts/${postId}/ai-chat/quiz`,
        { method: 'POST', body: JSON.stringify({}), signal: controller.signal },
      )
      setQuiz(response.data)
      setRound((r) => r + 1)
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('[use-practice-quiz] request failed', err)
      setError(errorMessageFor(err))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }, [postId])

  return { quiz, round, isLoading, error, start }
}

'use client'

import { useEffect, useState } from 'react'
import { customFetch } from '@/src/lib/api/fetcher'

/**
 * Questions about this post's content, for the chat panel's one-tap suggestions.
 *
 * Fetched the first time `enabled` is true, so a panel that is never opened costs nothing, and not
 * again once there is an answer. Any failure leaves the list empty: suggestions are decoration,
 * and the caller shows generic prompts instead of an error.
 */
export function useSuggestedQuestions(postId: string, enabled: boolean): string[] {
  const [loaded, setLoaded] = useState<{ postId: string; questions: string[] } | null>(null)
  const alreadyLoaded = loaded?.postId === postId

  useEffect(() => {
    if (!enabled || alreadyLoaded) return

    const controller = new AbortController()
    customFetch<{ data: { questions: string[] } }>(`/api/posts/${postId}/ai-chat/suggestions`, {
      signal: controller.signal,
    })
      .then((response) => {
        const questions = Array.isArray(response.data?.questions)
          ? response.data.questions.filter((q): q is string => typeof q === 'string')
          : []
        setLoaded({ postId, questions })
      })
      .catch(() => {
        // Aborted because the panel closed, or the request failed: keep the generic prompts.
      })

    return () => controller.abort()
  }, [enabled, postId, alreadyLoaded])

  return loaded?.postId === postId ? loaded.questions : []
}

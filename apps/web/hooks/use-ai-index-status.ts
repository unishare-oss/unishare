'use client'

import { usePostsControllerGetAiIndexStatus } from '@/src/lib/api/generated/posts/posts'
import type { AiIndexStatusDto } from '@/src/lib/api/generated/unishareAPI.schemas'

const POLL_INTERVAL_MS = 4000

/**
 * Live indexing progress for a post's documents, so the AI chat panel can stop silently
 * serving the no-citations fallback without saying so.
 *
 * Polls only while `state === 'preparing'`. Returning a number unconditionally would hit this
 * endpoint every 4 seconds forever on an idle post detail page, and it runs a `count` query.
 */
export function useAiIndexStatus(postId: string, enabled = true) {
  const { data, isLoading } = usePostsControllerGetAiIndexStatus(postId, {
    query: {
      enabled: enabled && Boolean(postId),
      select: (res) => res.data,
      // `query.state.data` is the raw envelope here — `select` is applied per-observer and
      // does not reach the refetch scheduler.
      refetchInterval: (query) =>
        query.state.data?.data?.state === 'preparing' ? POLL_INTERVAL_MS : false,
    },
  })

  return { status: data as AiIndexStatusDto | undefined, isLoading }
}

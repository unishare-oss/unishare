'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useUIStore } from '@/lib/store'
import type { ApiPost } from '@/lib/api-types'
import {
  getPostsControllerFindAllQueryKey,
  getPostsControllerFindOneQueryKey,
  getPostsControllerGetSavedPostsQueryKey,
  usePostsControllerSavePost,
  usePostsControllerUnsavePost,
} from '@/src/lib/api/generated/posts/posts'

/**
 * Saved state for one post, and a toggle for it, as the collection picker handles them: a
 * signed-in user's saves live on the server, a guest's in local storage. The change shows at once
 * and is undone with a toast if the server refuses it.
 *
 * One change at a time. A toggle made while the previous one is still on its way, including the
 * refetch after it, is ignored, so requests cannot finish out of order and leave the post in a
 * state the user did not pick last, and a finishing request cannot clear a newer optimistic value.
 * `pending` is true for that whole time, so the caller can disable its control.
 */
export function useToggleSavedPost(post: ApiPost) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const toggleGuestSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.savedPosts.some((p) => p.id === post.id))
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  // The guard is a ref because two clicks in one tick would both read a stale `pending`.
  const inFlight = useRef(false)
  const { mutate: savePost } = usePostsControllerSavePost()
  const { mutate: unsavePost } = usePostsControllerUnsavePost()

  const isSaved = optimistic ?? (isAuthenticated ? post.savedByCurrentUser : isGuestSaved)

  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) }),
      queryClient.invalidateQueries({ queryKey: getPostsControllerGetSavedPostsQueryKey() }),
    ])
  }

  function settle() {
    setOptimistic(null)
    setPending(false)
    inFlight.current = false
  }

  function toggle() {
    if (!isAuthenticated) {
      toggleGuestSaved(post)
      return
    }
    if (inFlight.current) return

    const next = !isSaved
    inFlight.current = true
    setPending(true)
    setOptimistic(next)
    const mutate = next ? savePost : unsavePost
    mutate(
      { id: post.id },
      {
        // Settled only once the refetch has landed, so the server's answer replaces the optimistic
        // value without a flicker back to the old one.
        onSuccess: () => {
          refresh().finally(settle)
        },
        onError: () => {
          settle()
          toast.error(next ? 'Could not save post' : 'Could not remove from saved')
        },
      },
    )
  }

  return { isSaved, pending, toggle }
}

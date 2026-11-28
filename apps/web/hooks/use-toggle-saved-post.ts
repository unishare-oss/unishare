'use client'

import { useState } from 'react'
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
 */
export function useToggleSavedPost(post: ApiPost) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const toggleGuestSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.savedPosts.some((p) => p.id === post.id))
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
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

  function toggle() {
    if (!isAuthenticated) {
      toggleGuestSaved(post)
      return
    }

    const next = !isSaved
    setOptimistic(next)
    const mutate = next ? savePost : unsavePost
    mutate(
      { id: post.id },
      {
        onSuccess: () => refresh().then(() => setOptimistic(null)),
        onError: () => {
          setOptimistic(null)
          toast.error(next ? 'Could not save post' : 'Could not remove from saved')
        },
      },
    )
  }

  return { isSaved, toggle }
}

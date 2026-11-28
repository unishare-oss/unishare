import { useCallback, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  getPostsControllerFindAllQueryKey,
  postsControllerFindAll,
} from '@/src/lib/api/generated/posts/posts'
import type { PaginatedPostEntity, PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export const COURSE_POSTS_LIMIT = 100

/**
 * Page 1 is already loaded by the caller. This fetches pages 2..N in parallel and returns every
 * post, de-duplicated, once all of them have arrived.
 */
export function useAllCoursePosts(courseId: string, firstPage: PaginatedPostEntity | undefined) {
  const totalPages = firstPage?.totalPages ?? 1
  const { pages, isError, failedRefetches } = useQueries({
    queries: Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => {
      const params = { courseId, limit: COURSE_POSTS_LIMIT, page: i + 2 }
      return {
        queryKey: getPostsControllerFindAllQueryKey(params),
        queryFn: () => postsControllerFindAll(params),
        enabled: !!firstPage,
      }
    }),
    combine: (results) => ({
      pages: results.map((result) => result.data?.data),
      isError: results.some((result) => result.isError),
      failedRefetches: results.filter((result) => result.isError).map((result) => result.refetch),
    }),
  })

  const retry = useCallback(
    () => failedRefetches.forEach((refetch) => refetch()),
    [failedRefetches],
  )
  const posts = useMemo(() => {
    if (!firstPage || !pages.every(Boolean)) return undefined
    const seen = new Set<string>()
    const all: PostEntity[] = []
    for (const post of [firstPage.items, ...pages.map((page) => page!.items)].flat()) {
      if (seen.has(post.id)) continue
      seen.add(post.id)
      all.push(post)
    }
    return all
  }, [firstPage, pages])

  return { posts, isError, retry }
}

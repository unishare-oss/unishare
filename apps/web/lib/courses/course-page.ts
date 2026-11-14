import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export interface CourseModule {
  moduleNumber: number
  count: number
  newest: PostEntity
  posts: PostEntity[]
}

/** Groups posts by module in ascending order. Posts arrive newest first, so the first of each group is its newest. */
export function groupByModule(posts: PostEntity[]): CourseModule[] {
  const groups = new Map<number, PostEntity[]>()
  for (const post of posts) {
    if (post.moduleNumber == null) continue
    groups.set(post.moduleNumber, [...(groups.get(post.moduleNumber) ?? []), post])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([moduleNumber, list]) => ({
      moduleNumber,
      count: list.length,
      newest: list[0],
      posts: list,
    }))
}

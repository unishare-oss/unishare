import { describe, expect, it } from 'vitest'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { groupByModule } from '@/lib/courses/course-page'

const post = (id: string, moduleNumber: number | null) =>
  ({ id, title: `Post ${id}`, moduleNumber }) as PostEntity

describe('groupByModule', () => {
  it('groups posts by module, named from the newest', () => {
    const modules = groupByModule([
      post('a', 20),
      post('b', 2),
      post('c', null),
      post('d', 2),
      post('e', 9),
    ])
    expect(modules.map((m) => m.moduleNumber)).toEqual([2, 9, 20])
    expect(modules[0].count).toBe(2)
    expect(modules[0].newest.id).toBe('b')
    expect(modules[0].posts.map((p) => p.id)).toEqual(['b', 'd'])
    expect(modules.flatMap((m) => m.posts).some((p) => p.id === 'c')).toBe(false)
  })
})

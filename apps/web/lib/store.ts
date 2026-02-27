import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiPost } from './api-types'

interface UIStore {
  readPostIds: string[]
  markRead: (id: string) => void
  savedPosts: ApiPost[]
  toggleSaved: (post: ApiPost) => void
  isGuestSaved: (id: string) => boolean
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      readPostIds: [],
      markRead: (id) => {
        if (!get().readPostIds.includes(id)) {
          set((s) => ({ readPostIds: [...s.readPostIds, id] }))
        }
      },
      savedPosts: [],
      toggleSaved: (post) => {
        const current = get().savedPosts
        set({
          savedPosts: current.some((p) => p.id === post.id)
            ? current.filter((p) => p.id !== post.id)
            : [...current, post],
        })
      },
      isGuestSaved: (id) => get().savedPosts.some((p) => p.id === id),
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)

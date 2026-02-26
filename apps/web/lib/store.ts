'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  readPostIds: string[]
  savedPostIds: string[]
  markRead: (id: string) => void
  toggleSaved: (id: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      readPostIds: [],
      savedPostIds: [],
      markRead: (id) => {
        if (!get().readPostIds.includes(id)) {
          set((s) => ({ readPostIds: [...s.readPostIds, id] }))
        }
      },
      toggleSaved: (id) =>
        set((s) => ({
          savedPostIds: s.savedPostIds.includes(id)
            ? s.savedPostIds.filter((p) => p !== id)
            : [...s.savedPostIds, id],
        })),
    }),
    { name: 'unishare-ui' },
  ),
)

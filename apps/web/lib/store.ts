import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  readPostIds: string[]
  markRead: (id: string) => void
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
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)

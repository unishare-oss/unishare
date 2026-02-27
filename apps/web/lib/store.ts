import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  readPostIds: string[]
  markRead: (id: string) => void
  savedPostIds: string[]
  toggleSaved: (id: string) => void
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
      savedPostIds: [],
      toggleSaved: (id) => {
        const current = get().savedPostIds
        set({
          savedPostIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        })
      },
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)

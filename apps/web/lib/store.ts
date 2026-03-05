import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiPost } from './api-types'

interface PdfAnnotationStore {
  annotationsByKey: Record<string, object[]>
  save: (key: string, annotations: object[]) => void
  get: (key: string) => object[]
}

export const usePdfAnnotationStore = create<PdfAnnotationStore>()(
  persist(
    (set, get) => ({
      annotationsByKey: {},
      save: (key, annotations) =>
        set((s) => ({ annotationsByKey: { ...s.annotationsByKey, [key]: annotations } })),
      get: (key) => get().annotationsByKey[key] ?? [],
    }),
    { name: 'unishare-pdf-annotations' },
  ),
)

interface FeedStore {
  pendingFilter: { deptId: string; courseId: string } | null
  setPendingFilter: (deptId: string, courseId: string) => void
  consumePendingFilter: () => { deptId: string; courseId: string } | null
}

export const useFeedStore = create<FeedStore>()((set, get) => ({
  pendingFilter: null,
  setPendingFilter: (deptId, courseId) => set({ pendingFilter: { deptId, courseId } }),
  consumePendingFilter: () => {
    const filter = get().pendingFilter
    set({ pendingFilter: null })
    return filter
  },
}))

interface UIStore {
  readPostIds: string[]
  markRead: (id: string) => void
  savedPosts: ApiPost[]
  toggleSaved: (post: ApiPost) => void
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
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)

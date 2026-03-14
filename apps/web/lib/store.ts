import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiPost } from './api-types'
import { PostType } from '@/src/lib/api/generated/unishareAPI.schemas'

export type TypeFilter = 'ALL' | PostType

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
  activeFilter: TypeFilter
  selectedDeptId: string | null
  selectedYear: number | null
  hasSelectedYear: boolean
  selectedCourseId: string
  pendingFilter: { deptId: string; courseId: string; yearLevel: number | null } | null
  setActiveFilter: (filter: TypeFilter) => void
  setSelectedDeptId: (deptId: string | null) => void
  setSelectedYear: (year: number | null) => void
  setSelectedCourseId: (courseId: string) => void
  setPendingFilter: (deptId: string, courseId: string, yearLevel: number | null) => void
  consumePendingFilter: () => { deptId: string; courseId: string; yearLevel: number | null } | null
}

export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      activeFilter: 'ALL',
      selectedDeptId: null,
      selectedYear: null,
      hasSelectedYear: false,
      selectedCourseId: '',
      pendingFilter: null,
      setActiveFilter: (activeFilter) => set({ activeFilter }),
      setSelectedDeptId: (selectedDeptId) => set({ selectedDeptId, selectedCourseId: '' }),
      setSelectedYear: (selectedYear) =>
        set({ selectedYear, hasSelectedYear: true, selectedCourseId: '' }),
      setSelectedCourseId: (selectedCourseId) => set({ selectedCourseId }),
      setPendingFilter: (deptId, courseId, yearLevel) =>
        set({ pendingFilter: { deptId, courseId, yearLevel } }),
      consumePendingFilter: () => {
        const filter = get().pendingFilter
        if (filter) {
          set({
            pendingFilter: null,
            selectedDeptId: filter.deptId,
            selectedCourseId: filter.courseId,
            selectedYear: filter.yearLevel,
            hasSelectedYear: true,
          })
        } else {
          set({ pendingFilter: null })
        }
        return filter
      },
    }),
    { name: 'unishare-feed' },
  ),
)

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

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
  selectedModuleNumber: number | null
  pendingFilter: { deptId: string; courseId: string; yearLevel: number | null } | null
  setActiveFilter: (filter: TypeFilter) => void
  setSelectedDeptId: (deptId: string | null) => void
  setSelectedYear: (year: number | null) => void
  setSelectedCourseId: (courseId: string) => void
  setSelectedModuleNumber: (moduleNumber: number | null) => void
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
      selectedModuleNumber: null,
      pendingFilter: null,
      setActiveFilter: (activeFilter) => set({ activeFilter }),
      setSelectedDeptId: (selectedDeptId) => set({ selectedDeptId, selectedCourseId: '' }),
      setSelectedYear: (selectedYear) =>
        set({ selectedYear, hasSelectedYear: true, selectedCourseId: '' }),
      setSelectedCourseId: (selectedCourseId) => set({ selectedCourseId }),
      setSelectedModuleNumber: (selectedModuleNumber) => set({ selectedModuleNumber }),
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
  sidebarCollapsed: boolean
  toggleSidebar: () => void
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
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)

export interface UploadTask {
  id: string // unique task id
  postId: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number // 0–100
}

interface UploadStore {
  tasks: UploadTask[]
  enqueue: (postId: string, files: File[]) => void
  setStatus: (id: string, status: UploadTask['status']) => void
  setProgress: (id: string, progress: number) => void
  remove: (id: string) => void
}

export const useUploadStore = create<UploadStore>()((set) => ({
  tasks: [],
  enqueue: (postId, files) =>
    set((s) => ({
      tasks: [
        ...s.tasks,
        ...files.map((file) => ({
          id: `${postId}-${file.name}-${Date.now()}`,
          postId,
          file,
          status: 'pending' as const,
          progress: 0,
        })),
      ],
    })),
  setStatus: (id, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
  setProgress: (id, progress) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, progress } : t)) })),
  remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}))

interface SettingsStore {
  fontSize: 'xsmall' | 'small' | 'normalsmall' | 'medium' | 'mediumlarge' | 'large' | 'xlarge'
  setFontSize: (
    size: 'xsmall' | 'small' | 'normalsmall' | 'medium' | 'mediumlarge' | 'large' | 'xlarge',
  ) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

const fontSizeOrder: (
  | 'xsmall'
  | 'small'
  | 'normalsmall'
  | 'medium'
  | 'mediumlarge'
  | 'large'
  | 'xlarge'
)[] = ['xsmall', 'small', 'normalsmall', 'medium', 'mediumlarge', 'large', 'xlarge']

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      fontSize: 'mediumlarge',
      setFontSize: (fontSize) => set({ fontSize }),
      increaseFontSize: () => {
        const current = get().fontSize
        const currentIndex = fontSizeOrder.indexOf(current)
        if (currentIndex < fontSizeOrder.length - 1) {
          set({ fontSize: fontSizeOrder[currentIndex + 1] })
        }
      },
      decreaseFontSize: () => {
        const current = get().fontSize
        const currentIndex = fontSizeOrder.indexOf(current)
        if (currentIndex > 0) {
          set({ fontSize: fontSizeOrder[currentIndex - 1] })
        }
      },
    }),
    { name: 'unishare-settings' },
  ),
)

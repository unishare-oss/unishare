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

import type { LibraryItems } from '@excalidraw/excalidraw/types'

interface LibraryStore {
  libraryItems: LibraryItems
  setLibraryItems: (items: LibraryItems) => void
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set) => ({
      libraryItems: [],
      setLibraryItems: (libraryItems) => set({ libraryItems }),
    }),
    { name: 'unishare-excalidraw-library' },
  ),
)

interface ChatLastSeenStore {
  lastSeenByRoom: Record<string, string>
  setLastSeen: (roomId: string, messageId: string) => void
  getLastSeen: (roomId: string) => string | null
}

export const useChatLastSeenStore = create<ChatLastSeenStore>()(
  persist(
    (set, get) => ({
      lastSeenByRoom: {},
      setLastSeen: (roomId, messageId) =>
        set((s) => ({ lastSeenByRoom: { ...s.lastSeenByRoom, [roomId]: messageId } })),
      getLastSeen: (roomId) => get().lastSeenByRoom[roomId] ?? null,
    }),
    { name: 'unishare-chat-last-seen' },
  ),
)

interface SettingsStore {
  fontSize: 'xsmall' | 'small' | 'normalsmall' | 'medium' | 'mediumlarge' | 'large' | 'xlarge'
  setFontSize: (
    size: 'xsmall' | 'small' | 'normalsmall' | 'medium' | 'mediumlarge' | 'large' | 'xlarge',
  ) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  chatSoundEnabled: boolean
  setChatSoundEnabled: (enabled: boolean) => void
}

const fontSizeOrder: (
  'xsmall' | 'small' | 'normalsmall' | 'medium' | 'mediumlarge' | 'large' | 'xlarge'
)[] = ['xsmall', 'small', 'normalsmall', 'medium', 'mediumlarge', 'large', 'xlarge']

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      fontSize: 'mediumlarge',
      setFontSize: (fontSize) => set({ fontSize }),
      chatSoundEnabled: true,
      setChatSoundEnabled: (chatSoundEnabled) => set({ chatSoundEnabled }),
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

export type FeedStyle = 'arcade' | 'desk' | 'classic'

interface FeedStyleStore {
  feedStyle: FeedStyle
  setFeedStyle: (feedStyle: FeedStyle) => void
}

/**
 * Persisted feed style preference. Uses skipHydration (same pattern as
 * useUIStore) so SSR markup and the first client render both use the
 * default, then Providers rehydrates from localStorage after mount.
 */
export const useFeedStyleStore = create<FeedStyleStore>()(
  persist(
    (set) => ({
      feedStyle: 'arcade',
      setFeedStyle: (feedStyle) => set({ feedStyle }),
    }),
    { name: 'unishare-feed-style', skipHydration: true },
  ),
)

interface BoardKeysStore {
  /** slug -> raw exported room key (base64url). Device-local only — never sent to the server. */
  keysBySlug: Record<string, string>
  setKey: (slug: string, exportedKey: string) => void
  getKey: (slug: string) => string | undefined
}

/**
 * A board's decryption key lives only in its URL fragment, which the boards list (room-card,
 * share-to-chat) never sees. Caching it here — on the same device that created or visited the
 * board — lets "Copy link" and "Share to Chat" from the list still produce a working link. A
 * device that never opened the board has no key to offer; those flows fall back to a bare,
 * keyless link for such rooms. See docs/board-e2e-encryption/planning.md.
 */
export const useBoardKeysStore = create<BoardKeysStore>()(
  persist(
    (set, get) => ({
      keysBySlug: {},
      setKey: (slug, exportedKey) =>
        set((s) => ({ keysBySlug: { ...s.keysBySlug, [slug]: exportedKey } })),
      getKey: (slug) => get().keysBySlug[slug],
    }),
    { name: 'unishare-board-keys' },
  ),
)

interface MutedRoomsStore {
  mutedRoomIds: string[]
  toggleMute: (roomId: string) => void
  isMuted: (roomId: string) => boolean
}

export const useMutedRoomsStore = create<MutedRoomsStore>()(
  persist(
    (set, get) => ({
      mutedRoomIds: [],
      toggleMute: (roomId) =>
        set((s) => ({
          mutedRoomIds: s.mutedRoomIds.includes(roomId)
            ? s.mutedRoomIds.filter((id) => id !== roomId)
            : [...s.mutedRoomIds, roomId],
        })),
      isMuted: (roomId) => get().mutedRoomIds.includes(roomId),
    }),
    { name: 'unishare-muted-rooms' },
  ),
)

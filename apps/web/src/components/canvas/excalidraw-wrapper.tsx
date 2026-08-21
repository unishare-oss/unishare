'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Excalidraw,
  CaptureUpdateAction,
  reconcileElements,
  useHandleLibrary,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useTheme } from 'next-themes'
import { useCollab, type RemoteFile } from '@/contexts/collab-context'
import { useLibraryStore } from '@/lib/store'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import { putToPresignedUrl, sha256Base64 } from '@/src/lib/upload'
import { encryptImageDataUrl, decryptImageToDataUrl } from '@/src/lib/board-crypto'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { LibraryItems, BinaryFiles, BinaryFileData } from '@excalidraw/excalidraw/types'
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types'
import type { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile'

const DARK_THEMES = [
  'theme-catppuccin-mocha',
  'theme-nord',
  'theme-tokyo-night',
  'theme-dracula',
  'theme-gruvbox-dark',
  'theme-midnight-library',
  'theme-ocean-depth',
]

const renderTopRightUI = () => null
const uiOptions = { canvasActions: { toggleTheme: false } }

function ExcalidrawWrapperInner() {
  const {
    slug,
    initialElements,
    initialFiles,
    roomKey,
    setExcalidrawAPI,
    isViewOnly,
    broadcastedVersionsRef,
    emitSceneUpdate,
    registerRemoteHandler,
    emitFileAdded,
    registerRemoteFileHandler,
  } = useCollab()
  const { theme } = useTheme()
  const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'
  const { libraryItems, setLibraryItems } = useLibraryStore()

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  // FileIds already uploaded (by us) or already hydrated (from the server) this session —
  // mirrors Excalidraw's own FileManager dirty-tracking so onChange doesn't re-upload on
  // every keystroke/drag tick.
  const persistedFileIdsRef = useRef<Set<string>>(new Set())

  // eslint-disable-next-line react-hooks/refs
  useHandleLibrary({ excalidrawAPI: excalidrawAPIRef.current })

  const handleAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      excalidrawAPIRef.current = api
      setExcalidrawAPI(api)
    },
    [setExcalidrawAPI],
  )

  const initialData = useMemo(
    () => ({
      elements: (initialElements ?? []) as ExcalidrawElement[],
      libraryItems,
      scrollToContent: true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialElements], // libraryItems intentionally excluded — only used on first mount
  )

  const handleLibraryChange = useCallback(
    (items: LibraryItems) => {
      setLibraryItems(items)
    },
    [setLibraryItems],
  )

  /** Uploads a newly-pasted image, encrypting it first when the room has a key. Never re-uploads
   * a fileId already marked persisted (see persistedFileIdsRef). */
  const persistFile = useCallback(
    async (file: BinaryFileData) => {
      try {
        const encrypted = Boolean(roomKey)
        const blob = encrypted
          ? await encryptImageDataUrl(file.dataURL, roomKey!)
          : await fetch(file.dataURL).then((res) => res.blob())
        const mimeType = encrypted ? 'application/octet-stream' : file.mimeType
        const presignedRes = await storageControllerGetPresignedUploadUrl({
          mimeType,
          uploadType: encrypted ? 'encrypted-blob' : 'image',
          purpose: 'board-attachment',
          roomSlug: slug,
          checksumSha256: await sha256Base64(blob),
        })
        const { url, key } = presignedRes.data as { url: string; key: string }
        await putToPresignedUrl(url, blob, mimeType)
        emitFileAdded({ fileId: file.id, key, mimeType: file.mimeType })
      } catch (err) {
        persistedFileIdsRef.current.delete(file.id) // allow a retry on the next onChange tick
        console.error('Failed to persist board image', err)
      }
    },
    [roomKey, slug, emitFileAdded],
  )

  /** Fetches a remote file's bytes and turns them back into something Excalidraw can render.
   * Legacy (unencrypted) rooms skip the fetch entirely — the presigned URL works as an <img> src
   * directly, since the object behind it is already a plain image. */
  const hydrateFile = useCallback(
    async (file: RemoteFile): Promise<BinaryFileData | null> => {
      try {
        const dataURL = roomKey
          ? await decryptImageToDataUrl(
              await fetch(file.url).then((res) => res.arrayBuffer()),
              file.mimeType,
              roomKey,
            )
          : file.url
        return {
          id: file.fileId,
          mimeType: file.mimeType,
          dataURL,
          created: Date.now(),
        } as unknown as BinaryFileData
      } catch (err) {
        console.error('Failed to load board image', err)
        return null
      }
    },
    [roomKey],
  )

  // On every local change, emit only elements with a higher version than last broadcast, and
  // upload any pasted image whose fileId we haven't persisted yet.
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], _appState: unknown, files: BinaryFiles) => {
      emitSceneUpdate(elements)
      for (const file of Object.values(files)) {
        if (persistedFileIdsRef.current.has(file.id)) continue
        persistedFileIdsRef.current.add(file.id)
        void persistFile(file)
      }
    },
    [emitSceneUpdate, persistFile],
  )

  // Hydrate images already on the board when we join (initialFiles) and any pasted by a
  // collaborator afterward (file-added). Both go through the same fetch+decrypt path.
  useEffect(() => {
    if (!initialFiles) return
    const api = excalidrawAPIRef.current
    if (!api) return
    void (async () => {
      const hydrated = (await Promise.all(initialFiles.map(hydrateFile))).filter(
        (f): f is BinaryFileData => f !== null,
      )
      for (const f of initialFiles) persistedFileIdsRef.current.add(f.fileId)
      if (hydrated.length > 0) api.addFiles(hydrated)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]) // hydrateFile intentionally excluded — only re-run when the file list itself changes

  useEffect(() => {
    const handleRemoteFile = (file: RemoteFile) => {
      if (persistedFileIdsRef.current.has(file.fileId)) return
      persistedFileIdsRef.current.add(file.fileId)
      void hydrateFile(file).then((hydrated) => {
        if (hydrated) excalidrawAPIRef.current?.addFiles([hydrated])
      })
    }
    registerRemoteFileHandler(handleRemoteFile)
    return () => registerRemoteFileHandler(null)
  }, [registerRemoteFileHandler, hydrateFile])

  // Register handler for incoming remote elements. Uses reconcileElements to
  // merge remote changes with local state — higher version wins per element.
  useEffect(() => {
    const handleRemoteElements = (remoteElements: ExcalidrawElement[]) => {
      const api = excalidrawAPIRef.current
      if (!api) return

      const localElements = api.getSceneElements() as readonly OrderedExcalidrawElement[]
      const appState = api.getAppState()
      const reconciled = reconcileElements(
        localElements,
        remoteElements as unknown as RemoteExcalidrawElement[],
        appState,
      )

      api.updateScene({
        elements: reconciled,
        captureUpdate: CaptureUpdateAction.NEVER,
      })

      // Mark reconciled versions as broadcast so we don't echo them back.
      for (const el of reconciled) {
        const current = broadcastedVersionsRef.current.get(el.id) ?? -1
        if (el.version > current) {
          broadcastedVersionsRef.current.set(el.id, el.version)
        }
      }
    }

    registerRemoteHandler(handleRemoteElements)
    return () => registerRemoteHandler(null)
  }, [registerRemoteHandler, broadcastedVersionsRef])

  return (
    <div
      className="h-full w-full"
      style={
        {
          '--color-primary': 'var(--primary)',
          '--color-primary-darker': 'var(--primary)',
        } as React.CSSProperties
      }
    >
      <Excalidraw
        excalidrawAPI={handleAPI}
        initialData={initialData}
        onChange={handleChange}
        theme={excalidrawTheme}
        renderTopRightUI={renderTopRightUI}
        UIOptions={uiOptions}
        viewModeEnabled={isViewOnly}
        libraryReturnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
        onLibraryChange={handleLibraryChange}
      />
    </div>
  )
}

export const ExcalidrawWrapper = memo(ExcalidrawWrapperInner)
export default ExcalidrawWrapper

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import ExcalidrawWrapper from './excalidraw-wrapper'

// Acts like the real context: setting a new value re-renders subscribers, even through memo().
const collab = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const store = {
    value: {} as Record<string, unknown>,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(value: Record<string, unknown>) {
      store.value = value
      listeners.forEach((listener) => listener())
    },
  }
  return store
})

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
  CaptureUpdateAction: { NEVER: 'NEVER' },
  reconcileElements: vi.fn(),
  useHandleLibrary: vi.fn(),
}))
vi.mock('@excalidraw/excalidraw/index.css', () => ({}))
vi.mock('@unishare-oss/unitheme/react', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@unishare-oss/unitheme', () => ({ isDarkTheme: () => false }))
vi.mock('@/contexts/collab-context', () => ({
  useCollab: () => useSyncExternalStore(collab.subscribe, () => collab.value),
}))
vi.mock('@/lib/store', () => ({
  useLibraryStore: () => ({ libraryItems: [], setLibraryItems: vi.fn() }),
}))
vi.mock('@/src/lib/api/generated/storage/storage', () => ({
  storageControllerGetPresignedUploadUrl: vi.fn(),
}))

const remoteFile = {
  fileId: 'file-1',
  key: 'boards/test/file-1',
  mimeType: 'image/png',
  url: 'https://storage.example/file-1',
}
// Same array instance across renders, as in the app: only the API changes.
const initialFiles = [remoteFile]

function collabValue(excalidrawAPI: unknown) {
  return {
    slug: 'test-board',
    initialElements: [],
    initialFiles,
    roomKey: null, // legacy room: hydrating needs no fetch or decrypt
    excalidrawAPI,
    setExcalidrawAPI: vi.fn(),
    isViewOnly: false,
    broadcastedVersionsRef: { current: new Map() },
    emitSceneUpdate: vi.fn(),
    registerRemoteHandler: vi.fn(),
    emitFileAdded: vi.fn(),
    registerRemoteFileHandler: vi.fn(),
  }
}

afterEach(cleanup)

describe('ExcalidrawWrapper', () => {
  it('adds the board images once the Excalidraw API arrives after the image list', async () => {
    collab.set(collabValue(null))
    render(<ExcalidrawWrapper />)

    const api = { addFiles: vi.fn() }
    act(() => collab.set(collabValue(api)))

    await waitFor(() => expect(api.addFiles).toHaveBeenCalledTimes(1))
    expect(api.addFiles).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'file-1', mimeType: 'image/png', dataURL: remoteFile.url }),
    ])
  })
})

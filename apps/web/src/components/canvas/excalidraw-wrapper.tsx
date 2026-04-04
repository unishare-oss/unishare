'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Excalidraw, CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useTheme } from 'next-themes'
import { useCollab } from '@/contexts/collab-context'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
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
    initialElements,
    setExcalidrawAPI,
    isViewOnly,
    broadcastedVersionsRef,
    emitSceneUpdate,
    registerRemoteHandler,
  } = useCollab()
  const { theme } = useTheme()
  const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)

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
      scrollToContent: true,
    }),
    [initialElements],
  )

  // On every local change, emit only elements with a higher version than last broadcast.
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      emitSceneUpdate(elements)
    },
    [emitSceneUpdate],
  )

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
      />
    </div>
  )
}

export const ExcalidrawWrapper = memo(ExcalidrawWrapperInner)
export default ExcalidrawWrapper

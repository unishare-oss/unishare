'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useTheme } from 'next-themes'
import { useCollab } from '@/contexts/collab-context'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const DARK_THEMES = [
  'theme-catppuccin-mocha',
  'theme-nord',
  'theme-tokyo-night',
  'theme-dracula',
  'theme-gruvbox-dark',
  'theme-midnight-library',
  'theme-ocean-depth',
]

// Stable references — these never change so we define them outside the component
// to guarantee they don't cause Excalidraw to re-render.
const renderTopRightUI = () => null
const uiOptions = { canvasActions: { toggleTheme: false } }

function ExcalidrawWrapperInner() {
  const { yElementsMap, ydoc, initialElements, setExcalidrawAPI, isViewOnly } = useCollab()
  const { theme } = useTheme()
  const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  // Track the versionNonce fingerprint of what we last wrote to Yjs.
  // Prevents handleChange from re-emitting remote state received via observer.
  const lastWrittenFingerprintRef = useRef<string>('')

  const handleAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      excalidrawAPIRef.current = api
      setExcalidrawAPI(api)
    },
    [setExcalidrawAPI],
  )

  // Memoised initial data — only changes when initialElements changes (room join/reconnect).
  const initialData = useMemo(
    () => ({
      elements: (initialElements ?? []) as ExcalidrawElement[],
      scrollToContent: true,
    }),
    [initialElements],
  )

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      const fingerprint = elements.map((el) => `${el.id}:${el.versionNonce}`).join('|')
      if (fingerprint === lastWrittenFingerprintRef.current) return
      lastWrittenFingerprintRef.current = fingerprint

      ydoc.transact(() => {
        const incomingIds = new Set(elements.map((el) => el.id))
        for (const el of elements) {
          const stored = yElementsMap.get(el.id) as ExcalidrawElement | undefined
          const differs =
            !stored ||
            el.version > stored.version ||
            (el.version === stored.version && el.versionNonce !== stored.versionNonce)
          if (differs) {
            yElementsMap.set(el.id, { ...el })
          }
        }
        for (const [id] of yElementsMap.entries()) {
          if (!incomingIds.has(id)) yElementsMap.delete(id)
        }
      })
    },
    [ydoc, yElementsMap],
  )

  useEffect(() => {
    const observer = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin !== 'remote' && transaction.origin !== 'init') return
      if (!excalidrawAPIRef.current) return

      // Sort by fractional index for correct z-order. Elements without an index,
      // or elements with the same index, use id as a deterministic tie-breaker
      // so all peers converge on the same ordering.
      const remoteElements = ([...yElementsMap.values()] as ExcalidrawElement[])
        .map((el) => ({ ...el }))
        .sort((a, b) => {
          if (a.index == null && b.index == null) return a.id.localeCompare(b.id)
          if (a.index == null) return 1
          if (b.index == null) return -1
          if (a.index < b.index) return -1
          if (a.index > b.index) return 1
          return a.id.localeCompare(b.id)
        })

      excalidrawAPIRef.current.updateScene({
        elements: remoteElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      })
      lastWrittenFingerprintRef.current = remoteElements
        .map((el) => `${el.id}:${el.versionNonce}`)
        .join('|')
    }

    yElementsMap.observe(observer as Parameters<typeof yElementsMap.observe>[0])
    return () => {
      yElementsMap.unobserve(observer as Parameters<typeof yElementsMap.unobserve>[0])
    }
  }, [yElementsMap])

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

// memo: prevents re-render when parent (CanvasInner) re-renders due to presence
// context updates (30fps cursor moves). ExcalidrawWrapper only re-renders when
// CollabContext (core) changes or theme changes.
export const ExcalidrawWrapper = memo(ExcalidrawWrapperInner)
export default ExcalidrawWrapper

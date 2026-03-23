'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
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
  const { yElementsMap, yElementOrder, ydoc, initialElements, setExcalidrawAPI, isViewOnly } =
    useCollab()
  const { theme } = useTheme()
  const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const isApplyingRemoteRef = useRef(false)

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
      if (isApplyingRemoteRef.current) return

      ydoc.transact(() => {
        // Sync changed/added elements. Use version+versionNonce together:
        // version is monotonic (bumped on every mutation), versionNonce is random
        // but using both catches undo (version can decrease) correctly.
        const incomingIds = new Set(elements.map((el) => el.id))
        for (const el of elements) {
          const stored = yElementsMap.get(el.id) as ExcalidrawElement | undefined
          if (!stored || stored.version !== el.version || stored.versionNonce !== el.versionNonce) {
            yElementsMap.set(el.id, el)
          }
        }

        // Remove elements deleted from the scene
        for (const [id] of yElementsMap.entries()) {
          if (!incomingIds.has(id)) {
            yElementsMap.delete(id)
          }
        }

        // Sync z-order only when it actually changed
        const newOrder = elements.map((el) => el.id)
        if (newOrder.join(',') !== yElementOrder.toArray().join(',')) {
          yElementOrder.delete(0, yElementOrder.length)
          yElementOrder.insert(0, newOrder)
        }
      }, 'local')
    },
    [ydoc, yElementsMap, yElementOrder],
  )

  useEffect(() => {
    const observer = () => {
      if (!excalidrawAPIRef.current) return
      isApplyingRemoteRef.current = true

      // Reconstruct ordered element array, deduplicating any z-order conflicts
      // that can occur when two users concurrently reorder elements (Y.Array LWW).
      const seen = new Set<string>()
      const elements = yElementOrder
        .toArray()
        .filter((id) => {
          if (seen.has(id) || !yElementsMap.has(id)) return false
          seen.add(id)
          return true
        })
        .map((id) => yElementsMap.get(id) as ExcalidrawElement)

      excalidrawAPIRef.current.updateScene({
        elements,
        captureUpdate: CaptureUpdateAction.NEVER,
      })

      // Synchronous reset — using requestAnimationFrame creates a window where
      // handleChange fires before the flag clears, causing remote updates to be
      // re-emitted as local changes.
      isApplyingRemoteRef.current = false
    }

    yElementsMap.observe(observer)
    yElementOrder.observe(observer)
    return () => {
      yElementsMap.unobserve(observer)
      yElementOrder.unobserve(observer)
    }
  }, [yElementsMap, yElementOrder])

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

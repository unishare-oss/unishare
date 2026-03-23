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
  const { yElementsMap, yElementOrder, ydoc, initialElements, setExcalidrawAPI, isViewOnly } =
    useCollab()
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
        let changed = 0
        for (const el of elements) {
          const stored = yElementsMap.get(el.id) as ExcalidrawElement | undefined
          const differs =
            !stored || stored.version !== el.version || stored.versionNonce !== el.versionNonce
          if (differs) {
            // Shallow-clone: Excalidraw mutates elements in-place during drawing.
            // Storing a reference means stored.versionNonce === el.versionNonce always,
            // so subsequent handleChange calls never detect changes. A clone snapshots
            // the state at write time so future comparisons work correctly.
            yElementsMap.set(el.id, { ...el })
            changed++
          }
        }
        for (const [id] of yElementsMap.entries()) {
          if (!incomingIds.has(id)) yElementsMap.delete(id)
        }
        const newOrder = elements.map((el) => el.id)
        if (newOrder.join(',') !== yElementOrder.toArray().join(',')) {
          yElementOrder.delete(0, yElementOrder.length)
          yElementOrder.insert(0, newOrder)
        }
      })
    },
    [ydoc, yElementsMap, yElementOrder],
  )

  useEffect(() => {
    // Only react to remote/init transactions — local transactions (our own writes)
    // are already in Excalidraw's state and don't need updateScene.
    const observer = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin !== 'remote' && transaction.origin !== 'init') return
      if (!excalidrawAPIRef.current) return

      const seen = new Set<string>()
      const remoteElements = yElementOrder
        .toArray()
        .filter((id) => {
          if (seen.has(id) || !yElementsMap.has(id)) return false
          seen.add(id)
          return true
        })
        // Clone on read: Excalidraw holds onto the object references we pass to
        // updateScene and mutates them in-place (e.g. x/y during move). If we
        // hand Y.Map's stored objects directly, the map's "snapshot" gets mutated
        // too, so subsequent handleChange calls see stored.versionNonce === el.versionNonce
        // and emit 0 changes. Cloning here keeps Y.Map's copies pristine for diffing.
        .map((id) => ({ ...(yElementsMap.get(id) as ExcalidrawElement) }))

      excalidrawAPIRef.current.updateScene({
        elements: remoteElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      })
      // Update fingerprint to match remote state so handleChange doesn't re-emit it
      lastWrittenFingerprintRef.current = remoteElements
        .map((el) => `${el.id}:${el.versionNonce}`)
        .join('|')
    }

    yElementsMap.observe(observer as Parameters<typeof yElementsMap.observe>[0])
    yElementOrder.observe(observer as Parameters<typeof yElementOrder.observe>[0])
    return () => {
      yElementsMap.unobserve(observer as Parameters<typeof yElementsMap.unobserve>[0])
      yElementOrder.unobserve(observer as Parameters<typeof yElementOrder.unobserve>[0])
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

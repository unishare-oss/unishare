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
  const { yElements, ydoc, initialElements, setExcalidrawAPI, isViewOnly } = useCollab()
  const { theme } = useTheme()
  const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const isApplyingRemoteRef = useRef(false)
  // Track the versionNonce fingerprint of what we last wrote to Yjs.
  // Using a local ref (not yElements) avoids false-unchanged results when
  // remote updates arrive and update yElements concurrently.
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
      if (isApplyingRemoteRef.current) return

      // Only write to Yjs when elements actually changed — Excalidraw fires onChange
      // on every pointer event (appState changes), not just element mutations.
      // We fingerprint using versionNonce (a random value Excalidraw bumps on each
      // mutation) tracked against our own last write, not yElements (which can be
      // updated by concurrent remote changes and cause false unchanged=true).
      const fingerprint = elements.map((el) => `${el.id}:${el.versionNonce}`).join('|')
      if (fingerprint === lastWrittenFingerprintRef.current) return
      lastWrittenFingerprintRef.current = fingerprint

      ydoc.transact(() => {
        yElements.delete(0, yElements.length)
        yElements.insert(0, elements as unknown[])
      })
    },
    [ydoc, yElements],
  )

  useEffect(() => {
    const observer = () => {
      if (!excalidrawAPIRef.current) return
      isApplyingRemoteRef.current = true
      const remoteElements = yElements.toArray() as ExcalidrawElement[]
      excalidrawAPIRef.current.updateScene({
        elements: remoteElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      })
      // Update our fingerprint to match the remote state so we don't re-emit it.
      lastWrittenFingerprintRef.current = remoteElements
        .map((el) => `${el.id}:${el.versionNonce}`)
        .join('|')
      requestAnimationFrame(() => {
        isApplyingRemoteRef.current = false
      })
    }

    yElements.observe(observer)
    return () => yElements.unobserve(observer)
  }, [yElements])

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

'use client'

import { useCallback, useEffect, useRef } from 'react'
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

export function ExcalidrawWrapper() {
  const { yElements, ydoc, initialElements, setExcalidrawAPI } = useCollab()
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

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (isApplyingRemoteRef.current) return

      // Only write to Yjs when elements actually changed — Excalidraw fires onChange
      // on every pointer event (appState changes), not just element mutations.
      // Skipping no-op writes eliminates the constant 100-500KB Yjs update storm.
      const current = yElements.toArray() as ExcalidrawElement[]
      const unchanged =
        elements.length === current.length &&
        elements.every((el, i) => current[i]?.id === el.id && current[i]?.version === el.version)
      if (unchanged) return

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
      excalidrawAPIRef.current.updateScene({
        elements: yElements.toArray() as ExcalidrawElement[],
        captureUpdate: CaptureUpdateAction.NEVER,
      })
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
        initialData={{
          elements: (initialElements ?? []) as ExcalidrawElement[],
          scrollToContent: true,
        }}
        onChange={handleChange}
        theme={excalidrawTheme}
        renderTopRightUI={() => null}
        UIOptions={{
          canvasActions: {
            toggleTheme: false,
          },
        }}
      />
    </div>
  )
}

export default ExcalidrawWrapper

'use client'

import { useRef, useState, useEffect } from 'react'
import { useCollabPresence } from '@/contexts/collab-context'
import { PRESENCE_COLORS } from '@/src/lib/presence'
import { sceneToOverlay } from '@/src/lib/cursor-coords'
import { RemoteCursor } from './remote-cursor'

export function CursorOverlay() {
  const { remoteCursors, excalidrawAPI } = useCollabPresence()
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setScrollTick] = useState(0)

  // Re-render when canvas scrolls or zooms — cursor screen positions change
  useEffect(() => {
    if (!excalidrawAPI) return
    // onScrollChange returns an unsubscribe function — return it for cleanup
    return excalidrawAPI.onScrollChange(() => setScrollTick((t) => t + 1))
  }, [excalidrawAPI])

  const appState = excalidrawAPI?.getAppState()

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {appState &&
        [...remoteCursors.entries()].map(([socketId, cursor]) => {
          const pos = sceneToOverlay(cursor.x, cursor.y, appState, containerRef)
          // Out-of-viewport: silently hidden
          const container = containerRef.current
          if (!container) return null
          const inBounds =
            pos.x >= -16 &&
            pos.y >= -20 &&
            pos.x <= container.offsetWidth + 16 &&
            pos.y <= container.offsetHeight + 20
          if (!inBounds) return null
          return (
            <RemoteCursor
              key={socketId}
              x={pos.x}
              y={pos.y}
              name={cursor.name}
              color={PRESENCE_COLORS[cursor.colorIndex % PRESENCE_COLORS.length]}
            />
          )
        })}
    </div>
  )
}

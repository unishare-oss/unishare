/**
 * Convert Excalidraw scene coordinates to overlay-local CSS pixel coordinates.
 *
 * Formula verified from @excalidraw/excalidraw@0.18.0 source (sceneCoordsToViewportCoords).
 * Step 1: scene → viewport: (sceneCoord + scroll) * zoom.value + offset
 * Step 2: viewport → overlay-local: viewportCoord - containerRect position
 */

interface AppStateSlice {
  scrollX: number
  scrollY: number
  zoom: { value: number }
  offsetLeft: number
  offsetTop: number
}

interface ContainerRef {
  current: { getBoundingClientRect(): { left: number; top: number } } | null
}

export function sceneToOverlay(
  sceneX: number,
  sceneY: number,
  appState: AppStateSlice,
  containerRef: ContainerRef,
): { x: number; y: number } {
  const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = appState
  // Step 1: scene → viewport (CSS pixels from browser viewport origin)
  const viewportX = (sceneX + scrollX) * zoom.value + offsetLeft
  const viewportY = (sceneY + scrollY) * zoom.value + offsetTop
  // Step 2: viewport → overlay-local (relative to overlay container)
  const rect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
  return {
    x: viewportX - rect.left,
    y: viewportY - rect.top,
  }
}

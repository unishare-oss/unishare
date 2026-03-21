import { describe, it, expect } from 'vitest'
import { sceneToOverlay } from './cursor-coords'

// Minimal mock for appState fields used by sceneToOverlay
const makeAppState = (
  overrides: Partial<{
    scrollX: number
    scrollY: number
    zoom: { value: number }
    offsetLeft: number
    offsetTop: number
  }> = {},
) => ({
  scrollX: 0,
  scrollY: 0,
  zoom: { value: 1 },
  offsetLeft: 0,
  offsetTop: 48, // header height
  ...overrides,
})

// Mock container ref with getBoundingClientRect
const makeContainerRef = (left = 0, top = 48) => ({
  current: {
    getBoundingClientRect: () => ({
      left,
      top,
      right: left + 800,
      bottom: top + 600,
      width: 800,
      height: 600,
      x: left,
      y: top,
      toJSON: () => {},
    }),
  },
})

describe('sceneToOverlay', () => {
  it('returns scene coords as overlay coords at zoom=1, scroll=(0,0), matching offsets', () => {
    const pos = sceneToOverlay(100, 200, makeAppState(), makeContainerRef())
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(200)
  })

  it('doubles coordinates at zoom=2', () => {
    const pos = sceneToOverlay(100, 200, makeAppState({ zoom: { value: 2 } }), makeContainerRef())
    expect(pos.x).toBeCloseTo(200)
    expect(pos.y).toBeCloseTo(400)
  })

  it('halves coordinates at zoom=0.5', () => {
    const pos = sceneToOverlay(100, 200, makeAppState({ zoom: { value: 0.5 } }), makeContainerRef())
    expect(pos.x).toBeCloseTo(50)
    expect(pos.y).toBeCloseTo(100)
  })

  it('shifts result with non-zero scrollX/scrollY', () => {
    const pos = sceneToOverlay(
      100,
      200,
      makeAppState({ scrollX: -50, scrollY: -100 }),
      makeContainerRef(),
    )
    // viewportX = (100 + -50) * 1 + 0 = 50, overlayX = 50 - 0 = 50
    // viewportY = (200 + -100) * 1 + 48 = 148, overlayY = 148 - 48 = 100
    expect(pos.x).toBeCloseTo(50)
    expect(pos.y).toBeCloseTo(100)
  })

  it('shifts with non-zero offsetLeft', () => {
    const pos = sceneToOverlay(100, 200, makeAppState({ offsetLeft: 20 }), makeContainerRef(20, 48))
    // viewportX = (100 + 0) * 1 + 20 = 120, overlayX = 120 - 20 = 100
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(200)
  })

  it('returns negative values for scene coords that map outside viewport', () => {
    const pos = sceneToOverlay(-500, -500, makeAppState(), makeContainerRef())
    expect(pos.x).toBeLessThan(0)
    expect(pos.y).toBeLessThan(0)
  })

  it('handles null containerRef.current gracefully', () => {
    const nullRef = { current: null }
    const pos = sceneToOverlay(100, 200, makeAppState(), nullRef as any)
    // Falls back to { left: 0, top: 0 }
    // viewportX = (100 + 0) * 1 + 0 = 100, overlayX = 100 - 0 = 100
    // viewportY = (200 + 0) * 1 + 48 = 248, overlayY = 248 - 0 = 248
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(248)
  })
})

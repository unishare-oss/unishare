import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { ReadingBar } from '@/components/post-detail/reading-bar'

let resizeCallback: () => void = () => {}
vi.stubGlobal(
  'ResizeObserver',
  class {
    constructor(cb: () => void) {
      resizeCallback = cb
    }
    observe() {}
    disconnect() {}
  },
)

describe('ReadingBar', () => {
  it('fills as the page scrolls', () => {
    const { container } = render(<ReadingBar />)
    const bar = container.querySelector('i') as HTMLElement
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 250, configurable: true })

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(bar.style.transform).toBe('scaleX(0.25)')
  })

  it('recomputes when the window resizes or the page height changes', () => {
    const { container } = render(<ReadingBar />)
    const bar = container.querySelector('i') as HTMLElement
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 3000,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true })

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(bar.style.transform).toBe('scaleX(0.25)')

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 6000,
      configurable: true,
    })
    act(() => resizeCallback())
    expect(bar.style.transform).toBe('scaleX(0.1)')
  })

  it('sits above the phone top bar', () => {
    const { container } = render(<ReadingBar />)
    expect((container.firstElementChild as HTMLElement).className).toContain('z-40')
  })
})

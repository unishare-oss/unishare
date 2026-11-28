import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Noto, type NotoMood } from './noto'

const state = vi.hoisted(() => ({ reduced: false, springStarts: 0 }))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  const react = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useReducedMotion: () => state.reduced,
    useSpring: ((...args: Parameters<typeof actual.useSpring>) => {
      const value = actual.useSpring(...args)
      react.useEffect(() => value.on('animationStart', () => state.springStarts++), [value])
      return value
    }) as typeof actual.useSpring,
  }
})

const MOODS: NotoMood[] = ['popIn', 'wave', 'point', 'think', 'nod', 'oops', 'cheer', 'sleep']
const part = (c: HTMLElement, name: string) => c.querySelector(`[data-part="${name}"]`)!
const opacity = (el: Element) =>
  Number((el as SVGElement).style.opacity || el.getAttribute('opacity'))

beforeEach(() => {
  state.reduced = false
  state.springStarts = 0
  Element.prototype.animate = vi.fn(
    () => ({ finished: new Promise(() => {}), cancel: vi.fn() }) as unknown as Animation,
  )
  Element.prototype.getAnimations = vi.fn(() => [])
})
afterEach(() => {
  vi.useRealTimers()
})

const tick = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

describe('Noto', () => {
  it.each(MOODS)('renders the %s mood', (mood) => {
    render(<Noto mood={mood} />)
    expect(screen.getByRole('img', { name: /noto/i })).toBeTruthy()
  })

  it("shows each mood's own pose", async () => {
    const { container, rerender } = render(<Noto mood="think" />)
    expect(opacity(part(container, 'dots'))).toBe(1)
    rerender(<Noto mood="oops" />)
    expect(opacity(part(container, 'sweat'))).toBe(1)
    expect(opacity(part(container, 'dots'))).toBe(0)
    rerender(<Noto mood="sleep" />)
    expect(opacity(part(container, 'zzz'))).toBe(1)
    expect(opacity(part(container, 'sweat'))).toBe(0)
    await tick(600)
    expect(opacity(part(container, 'shut'))).toBeGreaterThan(0.5)
    expect(opacity(part(container, 'eyes'))).toBeLessThan(0.5)
  })

  it('cheers with confetti', async () => {
    const onConfetti = vi.fn()
    const { container } = render(<Noto mood="cheer" onConfetti={onConfetti} />)
    await tick(200)
    expect(onConfetti).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('i').length).toBeGreaterThan(0)
  })

  it('starts springs when motion is allowed', async () => {
    render(<Noto mood="wave" />)
    await tick(150)
    expect(state.springStarts).toBeGreaterThan(0)
  })

  it('reaches the pose of popIn, point and nod', async () => {
    const popIn = render(<Noto mood="popIn" />)
    await tick(1000)
    expect(part(popIn.container, 'whole').getAttribute('transform')).toMatch(/^translate\(\S+ 0\)/)
    expect((part(popIn.container, 'whole') as SVGElement).style.opacity).not.toBe('0')
    popIn.unmount()

    const point = render(<Noto mood="point" />)
    await tick(500)
    expect(Number(part(point.container, 'fingerR').getAttribute('height'))).toBeGreaterThan(12)
    point.unmount()

    const nod = render(<Noto mood="nod" />)
    await tick(300)
    expect(opacity(part(nod.container, 'happy'))).toBeGreaterThan(0.5)
    expect(opacity(part(nod.container, 'eyes'))).toBeLessThan(0.5)
  })

  it('says its line', async () => {
    render(<Noto mood="point" line="Your final is in 6 days." />)
    await tick(400)
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('Your final is in 6 days.')
  })

  it('with reduced motion, starts no springs and throws no confetti', async () => {
    state.reduced = true
    const onConfetti = vi.fn()
    const view = render(<Noto mood="popIn" onConfetti={onConfetti} />)
    for (const mood of MOODS.slice(1, -1)) {
      view.rerender(<Noto mood={mood} onConfetti={onConfetti} />)
      await tick(mood === 'cheer' ? 2200 : 100)
    }
    view.rerender(<Noto mood="sleep" onConfetti={onConfetti} />)
    await tick(150)
    expect(opacity(part(view.container, 'zzz'))).toBe(1)
    expect(opacity(part(view.container, 'shut'))).toBeGreaterThan(0.5)
    expect(state.springStarts).toBe(0)
    expect(part(view.container, 'whole').getAttribute('transform') ?? 'translate(0 0)').toMatch(
      /^translate\(0 0\)/,
    )
    expect(onConfetti).not.toHaveBeenCalled()
    expect(view.container.querySelectorAll('i').length).toBe(0)
  }, 15000)

  it('with reduced motion, the whole body stays at rest after cheer and popIn', async () => {
    state.reduced = true
    for (const mood of ['cheer', 'popIn'] as const) {
      const { container, unmount } = render(<Noto mood={mood} />)
      await tick(900)
      expect(part(container, 'whole').getAttribute('transform') ?? 'translate(0 0)').toMatch(
        /^translate\(0 0\)/,
      )
      unmount()
    }
  })

  it('does not crash without the Web Animations API', async () => {
    // @ts-expect-error simulating a browser without WAAPI
    delete Element.prototype.animate
    // @ts-expect-error simulating a browser without WAAPI
    delete Element.prototype.getAnimations
    const view = render(<Noto mood="oops" />)
    await tick(150)
    view.rerender(<Noto mood="cheer" />)
    await tick(300)
    expect(screen.getByRole('img', { name: /noto/i })).toBeTruthy()
  })

  it('gives each Noto its own mouth clip id', () => {
    const { container } = render(
      <>
        <Noto mood="wave" />
        <Noto mood="wave" />
      </>,
    )
    const clips = [...container.querySelectorAll('clipPath')]
    expect(clips).toHaveLength(2)
    expect(clips[0].id).not.toBe(clips[1].id)
    const tongues = [...container.querySelectorAll('[data-part="tongue"]')]
    tongues.forEach((t, i) => expect(t.getAttribute('clip-path')).toBe(`url(#${clips[i].id})`))
  })
})

import { readFileSync } from 'node:fs'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MotionValue } from 'framer-motion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Noto, type NotoMood } from './noto'

const motion = vi.hoisted(() => ({
  reduced: false,
  springs: [] as MotionValue<number>[],
  started: 0,
}))

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => motion.reduced,
    useSpring: ((...args: Parameters<typeof actual.useSpring>) => {
      const value = actual.useSpring(...args) as MotionValue<number>
      if (!motion.springs.includes(value)) {
        motion.springs.push(value)
        // Subscribe at creation, so activity before any test code runs is counted too.
        value.on('animationStart', () => motion.started++)
      }
      return value
    }) as typeof actual.useSpring,
  }
})

const MOODS: NotoMood[] = ['popIn', 'wave', 'point', 'think', 'nod', 'cheer', 'oops', 'sleep']

const part = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-part="${name}"]`) as SVGElement

const pause = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

beforeEach(() => {
  motion.reduced = false
  motion.springs = []
  motion.started = 0
  // jsdom has no Web Animations API.
  Element.prototype.animate = vi.fn(
    () => ({ finished: new Promise(() => {}), cancel: vi.fn() }) as unknown as Animation,
  )
  Element.prototype.getAnimations = vi.fn(() => [])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Noto', () => {
  it.each(MOODS)('renders the %s mood', (mood) => {
    render(<Noto mood={mood} />)
    expect(screen.getByRole('img', { name: /noto/i })).toBeInTheDocument()
  })

  it('shows each mood’s own pose', async () => {
    const { container, rerender } = render(<Noto mood="think" />)
    await waitFor(() => expect(part(container, 'dots').style.opacity).toBe('1'))

    rerender(<Noto mood="oops" />)
    // A new mood interrupts the last one: the thought dots go.
    expect(part(container, 'dots').style.opacity).toBe('0')
    await waitFor(() => expect(part(container, 'sweat').style.opacity).toBe('1'))

    rerender(<Noto mood="sleep" />)
    await waitFor(() => expect(part(container, 'zzz').style.opacity).toBe('1'))
    // Lids close: the open eyes fade out as the lid spring settles.
    await waitFor(() =>
      expect(Number(part(container, 'eyes').getAttribute('opacity'))).toBeLessThan(0.5),
    )
  })

  it('cheers with confetti and calls onConfetti', async () => {
    const onConfetti = vi.fn()
    const { container } = render(<Noto mood="cheer" onConfetti={onConfetti} />)
    await waitFor(() => expect(onConfetti).toHaveBeenCalledTimes(1))
    expect(container.querySelectorAll('i').length).toBeGreaterThan(0)
  })

  it('says its line in a bubble, with the full text for screen readers', async () => {
    render(<Noto mood="point" line="Your final is in 6 days." />)
    const bubble = await screen.findByRole('status')
    expect(bubble).toHaveTextContent('Your final is in 6 days.')
  })

  it('gives each Noto its own mouth clip id', () => {
    const { container } = render(
      <>
        <Noto mood="wave" />
        <Noto mood="nod" />
      </>,
    )
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    container.querySelectorAll('[data-part="tongue"]').forEach((tongue, i) => {
      expect(tongue.getAttribute('clip-path')).toBe(`url(#${ids[i]})`)
    })
  })

  it('starts springs when motion is allowed', async () => {
    render(<Noto mood="wave" />)
    await pause(300)
    expect(motion.started).toBeGreaterThan(0)
  })

  it('with reduced motion, starts no springs and throws no confetti', async () => {
    motion.reduced = true
    const onConfetti = vi.fn()
    const { container, rerender } = render(<Noto mood="cheer" onConfetti={onConfetti} />)
    // Let cheer run to the end: confetti would be thrown 150 ms in.
    await pause(2600)
    expect(onConfetti).not.toHaveBeenCalled()
    expect(container.querySelectorAll('i')).toHaveLength(0)

    for (const mood of MOODS) {
      rerender(<Noto mood={mood} onConfetti={onConfetti} />)
      fireEvent.pointerMove(window, { clientX: 400, clientY: 50 })
      await pause(120)
    }
    // Poses still change, just instantly: the sleeping lids are shut.
    expect(part(container, 'zzz').style.opacity).toBe('1')
    await waitFor(() => expect(Number(part(container, 'eyes').getAttribute('opacity'))).toBe(0))

    expect(motion.started).toBe(0)
    expect(onConfetti).not.toHaveBeenCalled()
  })

  it.each([
    ['think', 'dots'],
    ['oops', 'sweat'],
  ] as const)('clears the %s extras when the move finishes', async (mood, extra) => {
    const { container } = render(<Noto mood={mood} />)
    await waitFor(() => expect(part(container, extra).style.opacity).toBe('1'))
    await waitFor(() => expect(part(container, extra).style.opacity).toBe('0'), { timeout: 3000 })
  })

  it('keeps the zzz while sleeping', async () => {
    const { container } = render(<Noto mood="sleep" />)
    await pause(1500)
    expect(part(container, 'zzz').style.opacity).toBe('1')
  })

  it('colours limbs and shadow from the --noto-limb and --noto-shadow variables', () => {
    const { container } = render(<Noto mood="wave" />)
    const html = container.innerHTML
    expect(html).toContain('stroke: var(--noto-limb')
    expect(html).toContain('fill: var(--noto-shadow')
  })

  it('defines light limbs for dark mode and the hero card in globals.css', () => {
    const css = readFileSync(`${__dirname}/../../app/globals.css`, 'utf8')
    expect(css).toMatch(/\.dark\s*\{[^}]*--noto-limb:\s*#e6ebf7/)
    expect(css).toMatch(/\.bg-hero\s*\{[^}]*--noto-limb:\s*#e6ebf7/)
  })
})

'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A scripted walk-through of a landing demo. Targets are `data-demo="…"` elements inside the
 * demo; clicks, typing and drags are dispatched on the real DOM, so the demo's own handlers
 * run and the text stays real, selectable HTML.
 */
export type DemoStep =
  | { wait: number }
  | { click: string }
  | { type: string; text: string }
  /** Drag `drag` by `by` (percent of `within`). */
  | { drag: string; within: string; by: [number, number] }
  /** Draw through `points` (percent of `draw`). */
  | { draw: string; points: [number, number][] }

type Mode = 'auto' | 'paused' | 'live'

const STOP = Symbol('stop')
/** A step whose target isn't on screen (e.g. a layout change) is skipped, not fatal. */
const MISSING = Symbol('missing')

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
const TICK = 40

export function DemoDirector({
  script,
  hint,
  onFinish,
  onTakeOver,
  children,
}: {
  script: DemoStep[]
  hint: string
  /** Called after one run instead of looping (the tour moves on). */
  onFinish?: () => void
  /** Called when a visitor starts using the demo themselves. */
  onTakeOver?: () => void
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(0)
  const [fading, setFading] = useState(false)
  const [playMode, setMode] = useState<Mode>('auto')
  const reduced = useReducedMotion()
  const mode: Mode = reduced ? 'live' : playMode
  const callbacks = useRef({ onFinish, onTakeOver })
  useEffect(() => {
    callbacks.current = { onFinish, onTakeOver }
  })

  useEffect(() => {
    const root = rootRef.current
    const cursor = cursorRef.current
    if (!root || !cursor) return
    if (reduced) return

    let visible = false
    let hovering = false
    let stopped = false
    const playing = () => visible && !hovering && !stopped && !document.hidden

    const sleep = () => new Promise((r) => setTimeout(r, TICK))
    const wait = async (ms: number) => {
      for (let left = ms; left > 0;) {
        if (stopped) throw STOP
        await sleep()
        if (playing()) left -= TICK
      }
    }
    const gate = async () => {
      while (!playing()) {
        if (stopped) throw STOP
        await sleep()
      }
    }

    const find = (name: string) => {
      const el = root.querySelector<HTMLElement>(`[data-demo="${name}"]`)
      if (!el) throw MISSING
      return el
    }
    const local = (x: number, y: number) => {
      const r = root.getBoundingClientRect()
      return { x: x - r.left, y: y - r.top }
    }
    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    const inside = (el: HTMLElement, [px, py]: [number, number]) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + (r.width * px) / 100, y: r.top + (r.height * py) / 100 }
    }
    const placeCursor = (x: number, y: number, ms: number) => {
      const p = local(x, y)
      cursor.style.transitionDuration = `${ms}ms, 200ms`
      cursor.style.transform = `translate(${p.x}px, ${p.y}px)`
      cursor.style.opacity = '1'
    }
    const moveTo = async (x: number, y: number) => {
      await gate()
      placeCursor(x, y, 550)
      await wait(600)
    }
    const press = async () => {
      cursor.dataset.pressed = ''
      await wait(120)
      delete cursor.dataset.pressed
    }
    const pointer = (el: HTMLElement, type: string, { x, y }: { x: number; y: number }) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 99,
          pointerType: 'mouse',
          isPrimary: true,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      )
    const setValue = (el: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const glide = async (
      el: HTMLElement,
      from: { x: number; y: number },
      to: { x: number; y: number },
      steps: number,
    ) => {
      for (let i = 1; i <= steps; i++) {
        await gate()
        const p = {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps,
        }
        placeCursor(p.x, p.y, 0)
        pointer(el, 'pointermove', p)
        await wait(TICK)
      }
    }

    const perform = async (step: DemoStep) => {
      if ('wait' in step) return wait(step.wait)
      if ('click' in step) {
        const el = find(step.click)
        const c = centre(el)
        await moveTo(c.x, c.y)
        await press()
        el.click()
        return wait(200)
      }
      if ('type' in step) {
        const el = find(step.type) as HTMLInputElement
        const r = el.getBoundingClientRect()
        await moveTo(r.left + 24, r.top + r.height / 2)
        for (const ch of step.text) {
          setValue(el, el.value + ch)
          await wait(ch === ' ' ? 90 : 55)
        }
        return wait(250)
      }
      if ('drag' in step) {
        const el = find(step.drag)
        const area = find(step.within)
        const start = centre(el)
        const a = area.getBoundingClientRect()
        const end = {
          x: start.x + (a.width * step.by[0]) / 100,
          y: start.y + (a.height * step.by[1]) / 100,
        }
        await moveTo(start.x, start.y)
        pointer(el, 'pointerdown', start)
        await glide(el, start, end, 18)
        pointer(el, 'pointerup', end)
        return wait(250)
      }
      const area = find(step.draw)
      const points = step.points.map((p) => inside(area, p))
      await moveTo(points[0].x, points[0].y)
      pointer(area, 'pointerdown', points[0])
      for (let i = 1; i < points.length; i++) await glide(area, points[i - 1], points[i], 5)
      pointer(area, 'pointerup', points[points.length - 1])
      return wait(250)
    }

    const loop = async () => {
      try {
        for (;;) {
          await wait(500)
          for (const step of script) {
            try {
              await perform(step)
            } catch (e) {
              if (e !== MISSING) throw e
            }
          }
          await wait(1800)
          cursor.style.opacity = '0'
          setFading(true)
          await wait(260)
          if (callbacks.current.onFinish) return callbacks.current.onFinish()
          setRun((r) => r + 1)
          setFading(false)
        }
      } catch (e) {
        if (e !== STOP) throw e
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { threshold: 0.4 },
    )
    observer.observe(root)

    // Hovering pauses so people can read (and select) the text; using a control hands it over.
    const onEnter = (e: PointerEvent) => {
      if (!e.isTrusted || e.pointerType !== 'mouse' || stopped) return
      hovering = true
      setMode('paused')
    }
    const onLeave = (e: PointerEvent) => {
      if (!e.isTrusted || stopped) return
      hovering = false
      setMode('auto')
    }
    const takeOver = (e: Event) => {
      if (!e.isTrusted || stopped) return
      const target = e.target as HTMLElement
      if (e.type === 'pointerdown' && !target.closest('button, input, [data-demo-grab]')) return
      stopped = true
      cursor.style.opacity = '0'
      setMode('live')
      callbacks.current.onTakeOver?.()
    }
    root.addEventListener('pointerenter', onEnter)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('pointerdown', takeOver, true)
    root.addEventListener('keydown', takeOver, true)

    loop()
    return () => {
      stopped = true
      observer.disconnect()
      root.removeEventListener('pointerenter', onEnter)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointerdown', takeOver, true)
      root.removeEventListener('keydown', takeOver, true)
    }
  }, [script, reduced])

  return (
    <div ref={rootRef} className="relative">
      <div key={run} className={cn('transition-opacity duration-200', fading && 'opacity-0')}>
        {children}
      </div>
      <div
        ref={cursorRef}
        aria-hidden
        className="demo-cursor pointer-events-none absolute left-0 top-0 z-20 opacity-0"
      >
        <svg
          width="18"
          height="22"
          viewBox="0 0 18 22"
          className="-translate-x-[3px] -translate-y-[2px]"
        >
          <path
            d="M2 2l13 10.5-6 .6 3.6 7-2.7 1.3-3.6-7.1L2 18.6z"
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 font-mono text-[11px] text-text-muted">
        <span
          className={cn(
            'size-1.5 rounded-full',
            mode === 'auto' && 'animate-pulse bg-success motion-reduce:animate-none',
            mode === 'paused' && 'bg-amber',
            mode === 'live' && 'bg-info',
          )}
        />
        {mode === 'auto' && 'Playing — click any control to try it'}
        {mode === 'paused' && 'Paused while you read'}
        {mode === 'live' && `Your turn — ${hint}`}
      </p>
    </div>
  )
}

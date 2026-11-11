'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  )
}

type BarPosition = { start: number; size: number; vertical: boolean }

function sameBar(a: BarPosition | null, b: BarPosition | null) {
  if (a === b) return true
  return (
    a !== null &&
    b !== null &&
    a.start === b.start &&
    a.size === b.size &&
    a.vertical === b.vertical
  )
}

// The one brand bar sits in the list and follows the trigger whose data-state is "active". It
// reads that from the DOM, so it cannot drift from Radix's own state. It re-measures when the list
// or a trigger resizes, when the orientation changes, and when the fonts are ready. Until the first
// measurement the active trigger carries a CSS underline instead (see the trigger classes), so the
// server HTML already shows which tab is active.
function TabsList({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [bar, setBar] = React.useState<BarPosition | null>(null)

  // The caller's ref and ours both point at the list.
  const setListRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // Layout effect: the first measurement lands before paint, so the CSS fallback never flashes.
  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const active = list.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]',
      )
      const vertical = list.getAttribute('aria-orientation') === 'vertical'
      const next: BarPosition | null = !active
        ? null
        : vertical
          ? { start: active.offsetTop, size: active.offsetHeight, vertical }
          : { start: active.offsetLeft, size: active.offsetWidth, vertical }
      // Keep the same state object when nothing moved, so an unchanged layout does not re-render.
      setBar((prev) => (sameBar(prev, next) ? prev : next))
    }

    const resizes = new ResizeObserver(measure)
    const watched = new Set<Element>()
    const watchTriggers = () => {
      for (const trigger of watched) {
        if (!list.contains(trigger)) {
          resizes.unobserve(trigger)
          watched.delete(trigger)
        }
      }
      list.querySelectorAll('[data-slot="tabs-trigger"]').forEach((trigger) => {
        if (watched.has(trigger)) return
        watched.add(trigger)
        resizes.observe(trigger)
      })
      measure()
    }

    resizes.observe(list)
    watchTriggers()
    const mutations = new MutationObserver(watchTriggers)
    mutations.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-orientation'],
    })
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    return () => {
      cancelled = true
      mutations.disconnect()
      resizes.disconnect()
    }
  }, [])

  return (
    <TabsPrimitive.List
      ref={setListRef}
      data-slot="tabs-list"
      data-bar={bar ? 'ready' : undefined}
      className={cn(
        'group/tabs-list relative flex items-end gap-5 border-b border-line group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch group-data-[orientation=vertical]/tabs:gap-1 group-data-[orientation=vertical]/tabs:border-r group-data-[orientation=vertical]/tabs:border-b-0',
        className,
      )}
      {...props}
    >
      {children}
      {bar && <TabBar position={bar} />}
    </TabsPrimitive.List>
  )
}

function TabBar({ position }: { position: BarPosition }) {
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: [0.77, 0, 0.175, 1] as const }

  if (position.vertical) {
    return (
      <motion.span
        aria-hidden
        initial={false}
        animate={{ y: position.start, height: position.size }}
        transition={transition}
        className="pointer-events-none absolute top-0 right-[-1px] w-[3px] rounded-l-[3px] bg-brand"
      />
    )
  }
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={{ x: position.start, width: position.size }}
      transition={transition}
      className="pointer-events-none absolute bottom-[-1px] left-0 h-[3px] rounded-t-[3px] bg-brand"
    />
  )
}

// The active trigger draws its own underline (the `after:` fallback) until the list reports a
// measured bar; then the single slid bar takes over. Horizontal only: the fallback is the rule.
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 px-0.5 pt-2 pb-2.5 text-[15px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-ink focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-ink after:absolute after:inset-x-0 after:-bottom-px after:hidden after:h-[3px] after:rounded-t-[3px] after:bg-brand after:content-[\'\'] data-[state=active]:after:block group-data-[bar=ready]/tabs-list:after:hidden group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:px-3 group-data-[orientation=vertical]/tabs:py-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

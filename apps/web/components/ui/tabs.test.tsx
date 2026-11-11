import { createRef, Profiler } from 'react'
import { renderToString } from 'react-dom/server'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function renderTabs(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  return render(
    <Tabs defaultValue="mine" orientation={orientation}>
      <TabsList>
        <TabsTrigger value="mine">My courses</TabsTrigger>
        <TabsTrigger value="campus">Campus</TabsTrigger>
        <TabsTrigger value="all">All unis</TabsTrigger>
      </TabsList>
      <TabsContent value="mine">mine panel</TabsContent>
      <TabsContent value="campus">campus panel</TabsContent>
      <TabsContent value="all">all panel</TabsContent>
    </Tabs>,
  )
}

// The single brand bar. It lives in the list, never inside a trigger.
const bars = () => document.querySelectorAll('span.bg-brand')
const listOf = () => screen.getByRole('tablist')

describe('underline Tabs', () => {
  it('draws one brand bar, as a direct child of the list', () => {
    renderTabs()
    expect(bars()).toHaveLength(1)
    expect(bars()[0].parentElement).toBe(listOf())
  })

  it('keeps one bar and reads the active tab from the DOM after a click', async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole('tab', { name: 'Campus' }))

    expect(screen.getByRole('tab', { name: 'Campus' })).toHaveAttribute('data-state', 'active')
    expect(bars()).toHaveLength(1)
    expect(bars()[0].parentElement).toBe(listOf())
  })

  it('moves the bar with the arrow keys (Radix)', async () => {
    const user = userEvent.setup()
    renderTabs()
    screen.getByRole('tab', { name: 'My courses' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Campus' })).toHaveAttribute('data-state', 'active')
    expect(bars()).toHaveLength(1)
  })

  it('slides the bar to the selected tab position', async () => {
    // jsdom has no layout, so give each trigger an offset from its label.
    const offsets = { 'My courses': 0, Campus: 120, 'All unis': 240 } as Record<string, number>
    const spy = vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return offsets[this.textContent ?? ''] ?? 0
    })
    try {
      const user = userEvent.setup()
      renderTabs()
      await user.click(screen.getByRole('tab', { name: 'Campus' }))
      await waitFor(() => expect(bars()[0].getAttribute('style')).toContain('120px'))
    } finally {
      spy.mockRestore()
    }
  })
})

describe('TabsList ref and resize tracking', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gives the caller its ref and still draws the bar', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs defaultValue="mine">
        <TabsList ref={ref}>
          <TabsTrigger value="mine">My courses</TabsTrigger>
          <TabsTrigger value="campus">Campus</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(ref.current).toBe(listOf())
    expect(bars()).toHaveLength(1)
  })

  it('observes every trigger, so a label that changes width re-measures the bar', () => {
    const observed: Element[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(el: Element) {
          observed.push(el)
        }
        unobserve() {}
        disconnect() {}
      },
    )
    renderTabs()
    const triggers = screen.getAllByRole('tab')
    for (const trigger of triggers) {
      expect(observed).toContain(trigger)
    }
  })
})

describe('trigger layout', () => {
  it('centres each label, so a stretched trigger (quizzes page) does not left-align it', () => {
    renderTabs()
    const trigger = screen.getByRole('tab', { name: 'Campus' })
    expect(trigger.className.split(' ')).toContain('justify-center')
  })
})

describe('first paint (server HTML)', () => {
  it('ships a CSS underline on the active tab, and no bar, before any JS measures', () => {
    const html = renderToString(
      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My courses</TabsTrigger>
          <TabsTrigger value="campus">Campus</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(html).not.toContain('data-bar=')
    // No bar element: the only bg-brand is the fallback's after: pseudo-element class.
    expect(html).not.toMatch(/(?<![\w:-])bg-brand/)
    // The fallback underline lives on the trigger's ::after and shows only while the bar is unmeasured.
    expect(html).toContain('data-[state=active]:after:block')
    expect(html).toContain('group-data-[bar=ready]/tabs-list:after:hidden')
  })

  it('marks the list ready once the bar is measured on the client', () => {
    renderTabs()
    expect(screen.getByRole('tablist')).toHaveAttribute('data-bar', 'ready')
  })
})

describe('measurement', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not re-render when a resize reports the same layout', () => {
    let notify: ResizeObserverCallback = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    let commits = 0
    render(
      <Profiler id="tabs" onRender={() => commits++}>
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My courses</TabsTrigger>
            <TabsTrigger value="campus">Campus</TabsTrigger>
          </TabsList>
        </Tabs>
      </Profiler>,
    )
    // Let the first measurement settle, then take the baseline.
    act(() => notify([], {} as ResizeObserver))
    const before = commits
    // jsdom has no layout, so every further measurement is the same (all zero): nothing commits.
    act(() => {
      notify([], {} as ResizeObserver)
      notify([], {} as ResizeObserver)
    })
    expect(commits).toBe(before)
  })
})

describe('vertical Tabs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stacks triggers in a column with a side border and puts the bar on the side', () => {
    renderTabs('vertical')
    const list = listOf()
    expect(list).toHaveAttribute('aria-orientation', 'vertical')
    expect(list.className).toContain('group-data-[orientation=vertical]/tabs:flex-col')
    expect(list.className).toContain('group-data-[orientation=vertical]/tabs:border-r')
    expect(list.className).toContain('group-data-[orientation=vertical]/tabs:border-b-0')
    // The bar is the side bar: it is set up for the vertical axis when the list is vertical.
    expect(bars()).toHaveLength(1)
    expect(bars()[0].className).toContain('right-[-1px]')
  })
})

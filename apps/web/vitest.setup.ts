import '@testing-library/jest-dom/vitest'

class ResizeObserverStub implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    void callback
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver

// jsdom has no layout, so it leaves scrollIntoView out. Components call it to keep the newest
// chat line in view; in tests there is nothing to scroll. Files that run in the node environment,
// such as proxy.test.ts, have no Element at all, so this is guarded.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ??= function scrollIntoView() {}
}

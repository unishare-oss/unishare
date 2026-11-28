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
// chat line in view; in tests there is nothing to scroll.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

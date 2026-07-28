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

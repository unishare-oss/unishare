import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollToHashComment } from '@/hooks/use-scroll-to-hash-comment'

describe('useScrollToHashComment', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
    document.body.innerHTML = '<div id="comment-c1"></div>'
    window.location.hash = '#comment-c1'
  })

  afterEach(() => {
    document.body.innerHTML = ''
    window.location.hash = ''
  })

  it('scrolls to the hash comment only once ready', () => {
    const { rerender } = renderHook(({ ready }) => useScrollToHashComment(ready), {
      initialProps: { ready: false },
    })
    expect(scrollIntoView).not.toHaveBeenCalled()

    rerender({ ready: true })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('does nothing when the hash names a missing comment', () => {
    window.location.hash = '#comment-missing'
    renderHook(() => useScrollToHashComment(true))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('does nothing for a hash that is not a comment', () => {
    window.location.hash = '#other'
    document.body.innerHTML = '<div id="other"></div>'
    renderHook(() => useScrollToHashComment(true))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

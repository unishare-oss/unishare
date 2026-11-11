import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReadingBar } from './reading-bar'

describe('ReadingBar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks scroll progress through the page', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000)

    render(<ReadingBar />)
    fireEvent.scroll(window)

    expect(screen.getByRole('presentation', { hidden: true }).firstChild).toHaveStyle({
      transform: 'scaleX(0.5)',
    })
  })
})

import { render, screen, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

const captured: { props?: Record<string, unknown> } = {}

vi.mock('sonner', async () => {
  const actual = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...actual,
    Toaster: (props: Record<string, unknown>) => {
      captured.props = props
      return <actual.Toaster {...props} />
    },
  }
})

import { Toaster } from './sonner'

describe('Toaster', () => {
  it('toasts use the demo style', async () => {
    render(<Toaster />)
    const props = captured.props!
    expect(props.position).toBe('bottom-center')
    expect(props.mobileOffset).toBe(88)
    expect(props.offset).toBe(24)
    const style = props.style as Record<string, string>
    expect(style['--normal-bg']).toBe('var(--ink)')
    expect(style['--normal-text']).toBe('var(--bg)')

    act(() => {
      toast('Saved')
    })
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })
})

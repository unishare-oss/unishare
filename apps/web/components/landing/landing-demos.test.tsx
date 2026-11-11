import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DecksDemo } from './landing-demos'

describe('DecksDemo generate button', () => {
  it('pairs orange fill with on-brand text while idle and generating', async () => {
    render(<DecksDemo />)
    const generate = screen.getByRole('button', { name: 'Generate' })
    expect(generate).toHaveClass('bg-amber', 'text-on-brand')
    expect(generate).not.toHaveClass('text-white')

    fireEvent.click(generate)
    const generating = screen.getByRole('button', { name: 'Generating…' })
    expect(generating).toHaveClass('bg-amber', 'text-on-brand')
    expect(generating).not.toHaveClass('text-white')
  })

  it('pairs the ready state fill with its own text colour', async () => {
    render(<DecksDemo />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    const again = await screen.findByRole('button', { name: 'Again' }, { timeout: 3000 })
    expect(again).toHaveClass('bg-success', 'text-white')
    expect(again).not.toHaveClass('text-on-brand')
  })
})

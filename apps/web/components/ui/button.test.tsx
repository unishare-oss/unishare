import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button, buttonVariants } from './button'

const VARIANTS = [
  'brand',
  'neutral',
  'sky',
  'ok',
  'destructive',
  'quiet',
  'outline',
  'ghost',
  'link',
] as const
const SOLID = ['brand', 'neutral', 'sky', 'ok', 'destructive']

describe('Button', () => {
  it.each(VARIANTS)('renders every demo variant: %s', (variant) => {
    const onClick = vi.fn()
    render(
      <Button variant={variant} onClick={onClick}>
        Go
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('data-variant', variant)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('default and secondary map to neutral', () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="default">Explicit</Button>
        <Button variant="secondary">Secondary</Button>
      </>,
    )
    for (const name of ['Default', 'Explicit', 'Secondary']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('data-variant', 'neutral')
    }
  })

  it("solid variants press, quiet ones don't", () => {
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Go</Button>)
      const button = screen.getByRole('button')
      if (SOLID.includes(variant)) expect(button).toHaveAttribute('data-solid')
      else expect(button).not.toHaveAttribute('data-solid')
      unmount()
    }
  })

  it('keeps data attributes when rendering a link with asChild', () => {
    render(
      <Button asChild variant="sky">
        <a href="/x">Open</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Open' })
    expect(link).toHaveAttribute('data-variant', 'sky')
    expect(link).toHaveAttribute('data-solid')
  })

  it('calm pages flatten non-brand buttons', () => {
    const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8').replace(/\s+/g, ' ')
    const calm = css.match(/\.calm \[data-slot='button'\]:not\(([^)]*)\) \{([^}]*)\}/)
    expect(calm).not.toBeNull()
    const [, excluded, body] = calm!
    for (const name of ['brand', 'link', 'ghost']) expect(excluded).toContain(`'${name}'`)
    expect(body).toMatch(/box-shadow:\s*none/)
    expect(body).toMatch(/border-width:\s*1\.5px/)
    // The 2px base lives in the components layer, so no border-width utility can beat the calm rule.
    expect(css).toMatch(/\[data-slot='button'\] \{ border-width: 2px; \}/)
    expect(buttonVariants({ variant: 'neutral' })).not.toMatch(/(^| )border-2( |$)/)

    const motion = css.match(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?\[data-slot='button'\]\[data-solid\]:active[\s\S]*?translate:\s*0 4px/,
    )
    expect(motion).not.toBeNull()
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

// The body of the CSS rule whose selector is exactly `selector`, or '' if there is none.
function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return ''
  return css.slice(start, css.indexOf('}', start))
}

const CALM =
  ".calm [data-slot='button']:not([data-variant='brand'], [data-variant='link'], [data-variant='ghost'])"

describe('Button variant classes', () => {
  it('brand is the opt-in tangerine fill with on-brand text', () => {
    render(<Button variant="brand">Start</Button>)
    const button = screen.getByRole('button', { name: 'Start' })
    expect(button).toHaveAttribute('data-variant', 'brand')
    expect(button.className).toContain('bg-brand')
    expect(button.className).toContain('text-on-brand')
  })

  it('no variant class carries an edge, border width or press motion (those live in the CSS layer)', () => {
    render(<Button variant="sky">Check</Button>)
    const button = screen.getByRole('button')
    expect(button.className).not.toMatch(/(?<![\w-])shadow-/)
    expect(button.className).not.toMatch(/(?<![\w-])border-2(?![\w-])/)
    expect(button.className).not.toMatch(/active:/)
  })

  it('quiet has a 1.5px border and no edge', () => {
    render(<Button variant="quiet">Cancel</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('border-[1.5px]')
    expect(ruleBody("[data-slot='button'][data-variant='quiet']")).toBe('')
  })

  it('ghost is borderless and transparent, with a surface-2 hover', () => {
    render(<Button variant="ghost">More</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('hover:bg-surface-2')
    // Own border classes only: focus-visible:border-ring in the base string is a state, not a border.
    expect(button.className).not.toMatch(/(?<![\w:-])border/)
    expect(button.className).not.toMatch(/(?<![\w:-])bg-surface(?![\w-])/)
  })

  it('maps the old names: default and secondary are neutral, outline is quiet', () => {
    const { rerender } = render(<Button>Save</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'neutral')

    rerender(<Button variant="secondary">Back</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'neutral')

    rerender(<Button variant="outline">Edit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'quiet')
  })
})

describe('Button edges and press (globals.css, @layer components)', () => {
  it('each solid variant has its own edge token, and sky and ok no longer hard-code theirs', () => {
    expect(ruleBody("[data-slot='button'][data-variant='brand']")).toContain('var(--press-brand)')
    expect(ruleBody("[data-slot='button'][data-variant='neutral']")).toContain('var(--press)')
    expect(ruleBody("[data-slot='button'][data-variant='sky']")).toContain('var(--press-sky)')
    expect(ruleBody("[data-slot='button'][data-variant='ok']")).toContain('var(--press-ok)')
    expect(ruleBody("[data-slot='button'][data-variant='destructive']")).toContain(
      'var(--press-bad)',
    )
  })

  it('defines the sky and ok press tokens once, not repeated in the dark block', () => {
    expect(css.match(/--press-sky:/g)).toHaveLength(1)
    expect(css.match(/--press-ok:/g)).toHaveLength(1)
  })

  it('the edge rules sit inside @layer components, so caller utilities such as shadow-none win', () => {
    const at = css.indexOf("[data-slot='button'][data-variant='brand'] {")
    const layer = css.lastIndexOf('@layer components {', at)
    expect(layer).toBeGreaterThan(-1)
    // No top-level close brace between the layer opening and the rule, i.e. the rule is inside it.
    expect(css.slice(layer, at)).not.toMatch(/\n}\n/)
  })

  it('every press rule ignores disabled buttons and aria-disabled links', () => {
    const pressRules = css.split('\n').filter((line) => line.includes(':active:not(:disabled)'))
    expect(pressRules.length).toBeGreaterThan(0)
    for (const rule of pressRules) {
      expect(rule).toContain(":not([aria-disabled='true'])")
    }
  })
})

// Prettier wraps long selectors across lines, so compare against whitespace-normalised CSS.
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
const flat = norm(css)

describe('.calm reading pages', () => {
  it('flattens non-brand buttons, but leaves link and ghost buttons alone (they are text)', () => {
    const start = flat.indexOf(`${norm(CALM)} {`)
    expect(start).toBeGreaterThan(-1)
    const body = flat.slice(start, flat.indexOf('}', start))
    expect(body).toContain('box-shadow: none')
    expect(body).toContain('border-width: 1.5px')
  })

  it('removes the drop as well as the edge: the calm press is a scale only', () => {
    const at = flat.indexOf(`${norm(CALM)}:active`)
    expect(at).toBeGreaterThan(-1)
    const press = flat.slice(at, flat.indexOf('}', at))
    expect(press).toContain('translate: none')
    expect(press).toContain('scale: 0.97')
  })
})

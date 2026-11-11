import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// WCAG 2.x contrast from the token values in globals.css, in both themes. Text pairs must reach
// 4.5:1 (AA for normal text).

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

// The body of the first block that opens with `selector {` (the :root or .dark token block).
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`no ${selector} block`)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[name] = value.trim()
  }
  return out
}

// Resolve a token to a hex colour, following var(--name) references.
function resolve(name: string, tokens: Record<string, string>): string {
  const value = tokens[name]
  if (value === undefined) throw new Error(`token --${name} is not defined`)
  const ref = value.match(/^var\(--([\w-]+)\)$/)
  return ref ? resolve(ref[1], tokens) : value
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const light = declarations(block(':root:root'))
const dark = { ...light, ...declarations(block(':root:root.dark')) }

const PAIRS: Array<[string, string]> = [
  // [text, background]
  ['sky', 'surface'], // links on cards
  ['on-brand', 'brand'], // labels on the orange fill
  ['foreground', 'surface'],
  ['foreground', 'surface-2'],
  ['foreground', 'brand-soft'],
]

describe.each([
  ['light', light],
  ['dark', dark],
])('text contrast in %s theme', (_theme, tokens) => {
  it.each(PAIRS)('--%s on --%s reaches 4.5:1', (text, background) => {
    const ratio = contrast(
      resolve(text === 'foreground' ? 'ink' : text, tokens),
      resolve(background, tokens),
    )
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

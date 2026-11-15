import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = resolve(__dirname, '..')
const SCOPE = ['app/page.tsx', 'components/landing', 'app/(auth)', 'app/auth', 'components/auth']

const OLD_PALETTE = 'd97706|b45309|f59e0b|fef3c7|f7f3ee|1c1917|e2dad0|16a34a|0369a1'
const OLD_RGB =
  '217,\\s*119,\\s*6|180,\\s*83,\\s*9|245,\\s*158,\\s*11|254,\\s*243,\\s*199|247,\\s*243,\\s*238|28,\\s*25,\\s*23'

const OLD_RGB_PATTERN = new RegExp(`rgba?\\((${OLD_RGB})`, 'i')

const OLD_STYLE: Record<'offsetShadow' | 'heavyBorder' | 'oldFont' | 'oldColour', RegExp[]> = {
  offsetShadow: [
    /shadow-\[-?[1-9]\d*px_-?\d+px_0/i,
    /box-shadow:\s*-?[1-9]\d*px\s+-?\d+px\s+0/i,
    /shadow-color/i,
    /\bcard-pop\b/i,
    /\barcade-(card|stat)\b/i,
  ],
  heavyBorder: [
    /border-strong/i,
    /border(-[trblxy])?-\[([3-9]|\d{2,})px\]/i,
    /\bborder(-[trblxy])?-(4|8)\b/i,
  ],
  oldFont: [/space[ -]?grotesk/i, /fira[ -]?code/i],
  oldColour: [/amber/i, new RegExp(`\\[#(${OLD_PALETTE})`, 'i'), OLD_RGB_PATTERN],
}

// In CSS, any amber or old hex or rgb counts; in TS/TSX only a Tailwind arbitrary value does.
const OLD_COLOUR_CSS = [/amber/i, new RegExp(`#(${OLD_PALETTE})\\b`, 'i'), OLD_RGB_PATTERN]

function scopeFiles(): string[] {
  const files: string[] = []
  const walk = (path: string) => {
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path)) walk(join(path, entry))
      return
    }
    if (/\.test\./.test(path) || !/\.(ts|tsx|css)$/.test(path)) return
    files.push(path)
  }
  for (const entry of SCOPE) walk(join(WEB_ROOT, entry))
  return files.map((file) => file.slice(WEB_ROOT.length + 1))
}

function hits(kind: keyof typeof OLD_STYLE): string[] {
  const found: string[] = []
  for (const file of scopeFiles()) {
    const text = readFileSync(join(WEB_ROOT, file), 'utf8')
    const patterns =
      kind === 'oldColour' && file.endsWith('.css') ? OLD_COLOUR_CSS : OLD_STYLE[kind]
    for (const pattern of patterns) {
      if (pattern.test(text)) found.push(`${file}: ${pattern}`)
    }
  }
  return found
}

describe('landing and auth pages drop the old style', () => {
  it('no offset-shadow utilities in landing and auth pages', () => {
    expect(hits('offsetShadow')).toEqual([])
  })

  it('no heavy-border utilities in landing and auth pages', () => {
    expect(hits('heavyBorder')).toEqual([])
  })

  it('no old font families in landing and auth pages', () => {
    expect(hits('oldFont')).toEqual([])
  })

  it('no hard-coded old colours in landing and auth pages', () => {
    expect(hits('oldColour')).toEqual([])
  })
})

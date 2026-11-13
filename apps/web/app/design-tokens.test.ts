import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Expected values are copied from the design system's tokens.css (values only). `--muted` is the
// design system's muted text colour; in globals.css it is held by --muted-foreground, because
// shadcn's --muted is a quiet fill.
const LIGHT: Record<string, string> = {
  '--bg': '#f5f6fb',
  '--surface': '#ffffff',
  '--surface-2': '#eef1f8',
  '--ink': '#14213d',
  '--muted': '#5b6785',
  '--line': '#dde2ee',
  '--edge': '#c9d0e0',
  '--brand': '#ff8a1f',
  '--brand-edge': '#d4650a',
  '--brand-soft': '#fff0e0',
  '--on-brand': '#1c1305',
  '--sky': '#2f6fe0',
  '--sky-soft': '#e6efff',
  '--sky-edge': '#1f53b3',
  '--ok': '#1d9a55',
  '--ok-soft': '#e2f6ea',
  '--ok-edge': '#157a42',
  '--bad': '#e0484d',
  '--bad-soft': '#fde8e8',
  '--bad-edge': '#b3353a',
  '--ice': '#2f9be0',
  '--hero': '#14213d',
  '--on-hero': '#ffffff',
  '--hero-muted': '#aab4d0',
  '--hero-line': '#2b3a60',
  '--m0': '#e3e7f1',
  '--m1': '#ffd3a3',
  '--m2': '#9cc0f7',
  '--m3': '#3d7fe6',
  '--m4': '#1b3f91',
  '--hl': 'rgba(255, 196, 0, 0.32)',
  '--glass': 'rgba(245, 246, 251, 0.78)',
  '--noto-limb': '#14213d',
  '--noto-shadow': '#14213d',
  '--press': '0 4px 0 #dde2ee',
  '--press-brand': '0 4px 0 #d4650a',
  '--press-sm': '0 3px 0 #dde2ee',
  '--lift': '0 10px 28px rgba(20, 33, 61, 0.1)',
}
const DARK: Record<string, string> = {
  '--bg': '#0e1424',
  '--surface': '#161f35',
  '--surface-2': '#1e2943',
  '--ink': '#edf1fb',
  '--muted': '#9aa6c3',
  '--line': '#2a3654',
  '--edge': '#080c18',
  '--brand': '#ff9a3c',
  '--brand-edge': '#b8600f',
  '--brand-soft': '#3a2816',
  '--on-brand': '#1c1305',
  '--sky': '#6aa2f7',
  '--sky-soft': '#1c2c4d',
  '--sky-edge': '#0b1a36',
  '--ok': '#3cc479',
  '--ok-soft': '#14301f',
  '--ok-edge': '#0d2416',
  '--bad': '#ff6b70',
  '--bad-soft': '#3a1a1c',
  '--bad-edge': '#2a0f11',
  '--ice': '#5cb7f2',
  '--hero': '#1f2c4f',
  '--on-hero': '#ffffff',
  '--hero-muted': '#a6b1cf',
  '--hero-line': '#33436e',
  '--m0': '#26314d',
  '--m1': '#6b4a26',
  '--m2': '#2f528f',
  '--m3': '#4f8ff0',
  '--m4': '#a9c8ff',
  '--hl': 'rgba(255, 170, 60, 0.28)',
  '--glass': 'rgba(14, 20, 36, 0.78)',
  '--noto-limb': '#e6ebf7',
  '--noto-shadow': '#000000',
  '--press': '0 4px 0 #2a3654',
  '--press-brand': '0 4px 0 #b8600f',
  '--press-sm': '0 3px 0 #2a3654',
  '--lift': '0 10px 28px rgba(0, 0, 0, 0.45)',
}

// Every Tailwind colour name the app had before the redesign. Dropping one silently breaks its
// utility classes (for example border-border-strong).
const LEGACY_COLOR_NAMES = [
  '--color-accent',
  '--color-accent-foreground',
  '--color-amber',
  '--color-amber-hover',
  '--color-amber-subtle',
  '--color-background',
  '--color-border',
  '--color-border-strong',
  '--color-card',
  '--color-card-foreground',
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
  '--color-destructive',
  '--color-destructive-foreground',
  '--color-foreground',
  '--color-info',
  '--color-input',
  '--color-muted',
  '--color-muted-foreground',
  '--color-popover',
  '--color-popover-foreground',
  '--color-primary',
  '--color-primary-foreground',
  '--color-ring',
  '--color-secondary',
  '--color-secondary-foreground',
  '--color-sidebar',
  '--color-sidebar-accent',
  '--color-sidebar-accent-foreground',
  '--color-sidebar-border',
  '--color-sidebar-foreground',
  '--color-sidebar-primary',
  '--color-sidebar-primary-foreground',
  '--color-sidebar-ring',
  '--color-success',
  '--color-surface-dark',
  '--color-text-muted',
  '--color-text-secondary',
  '--color-type-exam',
  '--color-type-exercise',
  '--color-type-note',
]

const WEB_ROOT = process.cwd()
const css = readFileSync(join(WEB_ROOT, 'app/globals.css'), 'utf8')

function block(selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  expect(start, `${selector} block`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('\n}', start))
}

function declared(source: string): Map<string, string> {
  return new Map(
    [...source.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const light = declared(block(':root:root'))
const dark = declared(block(':root:root.dark'))

describe('design tokens', () => {
  it('light and dark token values equal the design system', () => {
    for (const [name, value] of Object.entries(LIGHT)) {
      const key = name === '--muted' ? '--muted-foreground' : name
      expect(light.get(key), `light ${name}`).toBe(value)
    }
    for (const [name, value] of Object.entries(DARK)) {
      const key = name === '--muted' ? '--muted-foreground' : name
      expect(dark.get(key), `dark ${name}`).toBe(value)
    }
  })

  it('keeps every legacy Tailwind colour name in @theme inline', () => {
    const theme = css.slice(css.indexOf('@theme inline'))
    const defined = new Set(declared(theme).keys())
    const missing = LEGACY_COLOR_NAMES.filter((name) => !defined.has(name))
    expect(missing).toEqual([])
  })

  it('radius and easing tokens are defined once', () => {
    for (const decl of [
      '--r-s: 12px;',
      '--r: 18px;',
      '--r-l: 24px;',
      '--curve-out: cubic-bezier(0.23, 1, 0.32, 1);',
      '--curve-in-out: cubic-bezier(0.77, 0, 0.175, 1);',
      '--curve-pop: cubic-bezier(0.34, 1.56, 0.64, 1);',
    ]) {
      expect(css.split(decl).length - 1, decl).toBe(1)
    }
    expect(css).toMatch(/--radius-s:\s*var\(--r-s\);/)
    expect(css).toMatch(/--radius-card:\s*var\(--r\);/)
    expect(css).toMatch(/--radius-l:\s*var\(--r-l\);/)
    expect(css).toMatch(/--ease-out:\s*var\(--curve-out\);/)
    expect(css).toMatch(/--ease-in-out:\s*var\(--curve-in-out\);/)
    expect(css).toMatch(/--ease-pop:\s*var\(--curve-pop\);/)
  })

  it('font roles map to their faces', () => {
    const theme = css.slice(css.indexOf('@theme inline'))
    const role = (name: string) => theme.match(new RegExp(`--font-${name}:\\s*([^;]+);`))?.[1]
    // Face variables live on <body> (next/font), so roles must reference them directly: a root-level
    // var() would resolve where it is declared, where they do not exist.
    expect(role('sans')).toContain('var(--font-lexend)')
    expect(role('body')).toContain('var(--font-lexend)')
    expect(role('display')).toContain('var(--font-baloo)')
    expect(role('read')).toContain('var(--font-literata)')
    expect(role('mono')).toContain('var(--font-plex-mono)')
    for (const value of [...light.values(), ...dark.values()]) {
      expect(value).not.toMatch(/var\(--font-(baloo|lexend|literata|plex-mono)\)/)
    }
    expect(readdirSync(join(WEB_ROOT, 'fonts')).filter((f) => f.endsWith('.ttf'))).toEqual([])
  })

  it('every existing theme variable still resolves in both themes', () => {
    const unitheme = readFileSync(
      join(WEB_ROOT, 'node_modules/@unishare-oss/unitheme/dist/themes.css'),
      'utf8',
    )
    const start = unitheme.indexOf(':root, .theme-unishare {')
    expect(start).toBeGreaterThan(-1)
    const names = [...declared(unitheme.slice(start, unitheme.indexOf('}', start))).keys()]
    expect(names.length).toBeGreaterThan(30)
    for (const name of names) {
      expect(light.has(name), `light ${name}`).toBe(true)
      expect(dark.has(name), `dark ${name}`).toBe(true)
    }
  })
})

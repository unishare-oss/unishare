import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buttonVariants } from '@/components/ui/button'

// Retired tokens (the old offset-shadow colour and outline colour). The needles are split so
// this file does not match itself. Vitest runs from apps/web (`pnpm --filter web test`).
const RETIRED = ['shadow' + '-color', 'border' + '-strong']
const WEB_ROOT = process.cwd()
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib', 'src']
const SKIPPED_DIRS = ['generated', '.next', 'node_modules']

// Brand-edge is for icons, borders and large display text only (it fails small-text contrast).
// A line counts as an icon when it sizes a small box; text lines never have these classes.
const ICON_CLASS = /(?:size-\d|\bw-\d+\b|\bh-\d+\b)/
const TEXT_CLASS = /(?:font-|uppercase|truncate|tracking-|text-(?:xs|sm|base|lg|\[))/
const LARGE_TEXT = /text-(?:2xl|3xl|4xl|5xl|6xl)\b/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRS.includes(entry.name)) return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : []
  })
}

// Production sources only: tests may name classes they assert on.
const sources = () =>
  SOURCE_DIRS.flatMap((dir) => sourceFiles(join(WEB_ROOT, dir)))
    .filter((file) => !file.includes('.test.'))
    .map((file) => ({ file, text: readFileSync(file, 'utf8') }))

const globalsCss = () => readFileSync(join(WEB_ROOT, 'app/globals.css'), 'utf8')

describe('design tokens', () => {
  it('no source file uses the retired offset-shadow or outline tokens', () => {
    const offenders = sources()
      .filter(({ text }) => RETIRED.some((token) => text.includes(token)))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('light tokens win on :root:root and dark tokens on :root:root.dark, not by import order', () => {
    const css = globalsCss()
    expect(css).toMatch(/^:root:root \{/m)
    expect(css).toMatch(/^:root:root\.dark \{/m)
    // unitheme's palettes use only :root or one .theme-* class, so the doubled :root outranks them.
    const unithemeCss = readFileSync(
      join(WEB_ROOT, 'node_modules/@unishare-oss/unitheme/dist/themes.css'),
      'utf8',
    )
    const selectors = [...unithemeCss.matchAll(/^([^{}\n][^{}]*)\{/gm)].flatMap(([, list]) =>
      list.split(',').map((selector) => selector.trim()),
    )
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      expect(selector).toMatch(/^(:root|\.[\w-]+)$/)
    }
  })

  it('radius, easing and font stacks are each defined once and referenced from @theme inline', () => {
    const css = globalsCss()
    expect(css.match(/--r-s:\s*12px;/g)).toHaveLength(1)
    expect(css).toMatch(/--radius-s:\s*var\(--r-s\);/)
    expect(css.match(/--curve-out:\s*cubic-bezier/g)).toHaveLength(1)
    expect(css).toMatch(/--ease-out:\s*var\(--curve-out\);/)
    expect(css.match(/--stack-body:/g)).toHaveLength(1)
    expect(css).toMatch(/--font-body:\s*var\(--stack-body\);/)
  })
})

describe('colour pairings', () => {
  it('links use sky, not the brand colour, so they stay readable on white', () => {
    const link = buttonVariants({ variant: 'link' })
    expect(link).toContain('text-sky')
    expect(link).not.toMatch(/text-(primary|amber|brand)(?![\w-])/)
  })

  it('brand fills use on-brand text, not white', () => {
    const solid = buttonVariants({ variant: 'default' })
    expect(solid).toContain('bg-primary')
    expect(solid).toContain('text-primary-foreground')
    expect(solid).not.toContain('text-white')
  })

  it('destructive buttons use their own red ledge, not the orange one', () => {
    const destructive = buttonVariants({ variant: 'destructive' })
    expect(destructive).toContain('shadow-press-bad')
    expect(destructive).not.toContain('press-brand')
    const css = globalsCss()
    expect(css).toMatch(/--press-bad:\s*0 4px 0 var\(--bad-edge\);/)
    expect(css).toMatch(/--shadow-press-bad:\s*var\(--press-bad\);/)
  })

  it('the primary tokens pair brand with on-brand text in globals.css', () => {
    const css = readFileSync(join(WEB_ROOT, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/--primary:\s*var\(--brand\)/)
    expect(css).toMatch(/--primary-foreground:\s*var\(--on-brand\)/)
  })

  it('no source uses brand orange as text (it fails contrast on light grounds)', () => {
    const offenders = sources()
      .filter(({ text }) => /(?<![\w-])text-(?:amber|primary)(?![\w/-])/.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('text-brand-edge is only used on icons and large display text', () => {
    const offenders = sources().flatMap(({ file, text }) =>
      text
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) =>
          /(?<![\w:-])(?:hover:|group-hover:)?text-brand-edge(?![\w-])/.test(line),
        )
        .filter(({ line }) => {
          const icon = ICON_CLASS.test(line) && !TEXT_CLASS.test(line)
          return !icon && !LARGE_TEXT.test(line)
        })
        .map(({ i }) => `${file}:${i + 1}`),
    )
    expect(offenders).toEqual([])
  })

  it('no solid brand fill has white text within three lines (catches multi-line cn() calls)', () => {
    const offenders = sources()
      .filter(({ text }) => {
        const lines = text.split('\n')
        return lines.some(
          (line, i) =>
            /(?<![\w:-])bg-(?:primary|amber)(?![\w/-])/.test(line) &&
            lines
              .slice(Math.max(0, i - 3), i + 4)
              .some(
                (near) =>
                  /(?<![\w:-])text-white(?![\w/-])/.test(near) && !/(?<![\w:-])bg-/.test(near),
              ),
        )
      })
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})

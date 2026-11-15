import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB = join(__dirname, '..')
const SCAN_ROOTS = ['app', 'components', 'contexts', 'hooks', 'lib', 'src']
const EXTENSIONS = ['.ts', '.tsx', '.css']

const OLD_PALETTE_HEX = 'd97706|b45309|f59e0b|fef3c7|f7f3ee|1c1917|e2dad0|16a34a|0369a1'
const OLD_PALETTE_RGB =
  '(217,\\s*119,\\s*6|180,\\s*83,\\s*9|245,\\s*158,\\s*11|254,\\s*243,\\s*199|247,\\s*243,\\s*238|28,\\s*25,\\s*23)'

const OLD_STYLE: { id: string; name: string; pattern: RegExp; files?: 'css' | 'code' }[] = [
  { id: 'DW1', name: 'offset shadow', pattern: /shadow-\[-?[1-9]\d*px_-?\d+px_0/i },
  { id: 'DW1', name: 'offset shadow', pattern: /box-shadow:\s*-?[1-9]\d*px\s+-?\d+px\s+0/i },
  { id: 'DW1', name: 'shadow-color', pattern: /shadow-color/i },
  { id: 'DW1', name: 'card-pop', pattern: /\bcard-pop\b/i },
  { id: 'DW1', name: 'arcade card/stat', pattern: /\barcade-(card|stat)\b/i },
  { id: 'DW2', name: 'border-strong', pattern: /border-strong/i },
  {
    id: 'DW2',
    name: 'heavy border',
    pattern: /border(-[trblxy])?-\[([3-9]|\d{2,})px\]/i,
  },
  { id: 'DW2', name: 'heavy border', pattern: /\bborder(-[trblxy])?-(4|8)\b/i },
  { id: 'DW3', name: 'Space Grotesk or Fira Code', pattern: /space[ _-]?grotesk|fira[ _-]?code/i },
  { id: 'DW4', name: 'amber', pattern: /amber/i },
  {
    id: 'DW4',
    name: 'old palette hex (arbitrary value)',
    pattern: new RegExp(`\\[#(${OLD_PALETTE_HEX})`, 'i'),
    files: 'code',
  },
  {
    id: 'DW4',
    name: 'old palette hex (css)',
    pattern: new RegExp(`#(${OLD_PALETTE_HEX})\\b`, 'i'),
    files: 'css',
  },
  {
    id: 'DW4',
    name: 'old palette rgb',
    pattern: new RegExp(`rgba?\\(\\s*${OLD_PALETTE_RGB}`, 'i'),
  },
]

function toPosix(p: string) {
  return p.split(sep).join('/')
}

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'generated') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, out)
      continue
    }
    if (!EXTENSIONS.some((ext) => name.endsWith(ext))) continue
    if (/\.test\./.test(name)) continue
    out.push(toPosix(relative(WEB, full)))
  }
  return out
}

function sourceFiles(): string[] {
  const files: string[] = []
  for (const root of SCAN_ROOTS) {
    const dir = join(WEB, root)
    if (existsSync(dir)) walk(dir, files)
  }
  return files
}

function hits(ids: string[]) {
  const found: string[] = []
  for (const rel of sourceFiles()) {
    const isCss = rel.endsWith('.css')
    const text = readFileSync(join(WEB, rel), 'utf8')
    for (const rule of OLD_STYLE) {
      if (!ids.includes(rule.id)) continue
      if (rule.files === 'css' && !isCss) continue
      if (rule.files === 'code' && isCss) continue
      if (rule.pattern.test(text)) found.push(`${rel}: ${rule.name} (${rule.pattern.source})`)
    }
  }
  return found
}

describe('old style', () => {
  it('one whole-app check with no exclusions', () => {
    expect(hits(['DW1', 'DW2', 'DW3', 'DW4'])).toEqual([])
    const fonts = existsSync(join(WEB, 'fonts')) ? readdirSync(join(WEB, 'fonts')) : []
    expect(fonts.filter((f) => /space[ _-]?grotesk|fira[ _-]?code/i.test(f))).toEqual([])
    for (const old of ['landing-auth', 'decks-quizzes-calendar', 'rest']) {
      expect(existsSync(join(WEB, `app/old-style-${old}.test.ts`))).toBe(false)
    }
  })

  it('old theme and look-switcher code is gone', () => {
    const mentions = sourceFiles().filter((rel) =>
      /useFeedStyleStore|FeedStyle|data-detail-style/.test(readFileSync(join(WEB, rel), 'utf8')),
    )
    expect(mentions).toEqual([])
    for (const gone of [
      'app/legacy.css',
      'components/calendar/arcade-exam-calendar.tsx',
      'components/calendar/desk-exam-calendar.tsx',
    ]) {
      expect(existsSync(join(WEB, gone)), gone).toBe(false)
    }
    expect(readFileSync(join(WEB, 'app/globals.css'), 'utf8')).not.toMatch(/legacy\.css/)
  })
})

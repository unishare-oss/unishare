import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB = join(__dirname, '..')
const SCAN_ROOTS = ['app', 'components', 'contexts', 'hooks', 'lib', 'src']
const EXTENSIONS = ['.ts', '.tsx', '.css']

// Paths owned by slices 10a and 10b, plus the excluded list (slices 5-9 and legacy.css).
// Hard-coded on purpose: the three 10x slices run in parallel and share no helper.
const SKIP: readonly string[] = [
  // 10a
  'app/page.tsx',
  'components/landing/',
  'app/(auth)/',
  'app/auth/',
  'components/auth/',
  // 10b
  'app/(app)/(protected)/decks/',
  'app/(app)/d/',
  'components/decks/',
  'lib/decks/',
  'app/(app)/quizzes/',
  'components/quiz/',
  'app/(app)/(protected)/calendar/',
  'components/calendar/',
  'lib/calendar/',
  // slice 5
  'components/app-rail.tsx',
  'components/mobile-nav.tsx',
  'components/navigation/',
  'components/profile/your-stuff.tsx',
  'components/page-rail.tsx',
  'hooks/use-unread-notification-count.ts',
  // slice 6
  'app/(app)/feed/',
  'components/feed/',
  'components/today/',
  'components/post-card.tsx',
  // slice 7
  'app/(app)/posts/[id]/',
  'components/post-detail/',
  // slice 8
  'app/(app)/courses/',
  'components/course/',
  'lib/courses/course-page.ts',
  'hooks/use-all-course-posts.ts',
  // slice 9
  'app/(app)/(protected)/posts/new/',
  'components/posts/share-form.tsx',
  'components/posts/module-select.tsx',
  'components/posts/share-preview-card.tsx',
  'lib/posts/share-defaults.ts',
  // legacy stylesheet, deleted by slice 11
  'app/legacy.css',
]

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
    pattern: new RegExp(`\\[#(${OLD_PALETTE_HEX})\\]`, 'i'),
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

function isSkipped(rel: string) {
  return SKIP.some((entry) => (entry.endsWith('/') ? rel.startsWith(entry) : rel === entry))
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

function scopeFiles(): string[] {
  const files: string[] = []
  for (const root of SCAN_ROOTS) {
    const dir = join(WEB, root)
    if (existsSync(dir)) walk(dir, files)
  }
  return files.filter((rel) => !isSkipped(rel))
}

function hits(ids: string[]) {
  const found: string[] = []
  for (const rel of scopeFiles()) {
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

describe('admin and the remaining pages', () => {
  it('no offset-shadow utilities in admin and the remaining pages', () => {
    expect(hits(['DW1'])).toEqual([])
  })

  it('no heavy-border utilities in admin and the remaining pages', () => {
    expect(hits(['DW2'])).toEqual([])
  })

  it('no old font families in admin and the remaining pages', () => {
    expect(hits(['DW3'])).toEqual([])
    const fonts = existsSync(join(WEB, 'fonts')) ? readdirSync(join(WEB, 'fonts')) : []
    expect(fonts.filter((f) => /space[ _-]?grotesk|fira[ _-]?code/i.test(f))).toEqual([])
  })

  it('no hard-coded old colours in admin and the remaining pages', () => {
    expect(hits(['DW4'])).toEqual([])
  })

  it('every SKIP path is real', () => {
    const missing = SKIP.filter((entry) => {
      const clean = entry.replace(/\/$/, '')
      return !existsSync(join(WEB, clean))
    })
    expect(missing).toEqual([])
  })
})

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SCOPE = [
  'app/(app)/(protected)/decks',
  'app/(app)/d',
  'components/decks',
  'lib/decks',
  'app/(app)/quizzes',
  'components/quiz',
  'app/(app)/(protected)/calendar',
  'components/calendar',
  'lib/calendar',
]

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
  oldColour: [
    /amber/i,
    /\[#(d97706|b45309|f59e0b|fef3c7|f7f3ee|1c1917|e2dad0|16a34a|0369a1)\]/i,
    /rgba?\(\s*(217\s*,\s*119\s*,\s*6|180\s*,\s*83\s*,\s*9|245\s*,\s*158\s*,\s*11|254\s*,\s*243\s*,\s*199|247\s*,\s*243\s*,\s*238|28\s*,\s*25\s*,\s*23)\b/i,
  ],
}

const CSS_OLD_COLOUR = /#(d97706|b45309|f59e0b|fef3c7|f7f3ee|1c1917|e2dad0|16a34a|0369a1)\b/i

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    if (/\.test\./.test(entry)) return []
    return /\.(ts|tsx|css)$/.test(entry) ? [full] : []
  })
}

function scopeFiles(): string[] {
  return SCOPE.flatMap((dir) => walk(path.join(webRoot, dir)))
}

function violations(kind: keyof typeof OLD_STYLE): string[] {
  return scopeFiles().flatMap((file) => {
    const text = readFileSync(file, 'utf8')
    const rel = path.relative(webRoot, file)
    const patterns = [...OLD_STYLE[kind]]
    if (kind === 'oldColour' && file.endsWith('.css')) patterns.push(CSS_OLD_COLOUR)
    return patterns.filter((re) => re.test(text)).map((re) => `${rel}: ${re.source}`)
  })
}

describe('decks, quizzes and calendar source', () => {
  it('no offset-shadow utilities in decks, quizzes and calendar', () => {
    expect(violations('offsetShadow')).toEqual([])
  })

  it('no heavy-border utilities in decks, quizzes and calendar', () => {
    expect(violations('heavyBorder')).toEqual([])
  })

  it('no old font families in decks, quizzes and calendar', () => {
    expect(violations('oldFont')).toEqual([])
  })

  it('no hard-coded old colours in decks, quizzes and calendar', () => {
    expect(violations('oldColour')).toEqual([])
  })
})

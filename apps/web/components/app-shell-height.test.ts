import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Full-height classes inside the shell add to the phone top bar's padding, so they must use
// --mobile-topbar-h. A plain min-h-screen or h-screen would make those pages one bar too tall.
const WEB_ROOT = process.cwd()

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe('full-height pages inside the app shell', () => {
  it('offset full-height classes by the phone top bar', () => {
    const files = [
      ...sourceFiles(join(WEB_ROOT, 'app/(app)')),
      join(WEB_ROOT, 'components/guest-university-picker.tsx'),
      join(WEB_ROOT, 'components/no-university-notice.tsx'),
    ]
    const offenders = files.filter((file) =>
      /(^|[\s"'`:])(min-h-screen|h-screen)(?=[\s"'`])/.test(readFileSync(file, 'utf8')),
    )
    expect(offenders.map((file) => file.replace(WEB_ROOT, ''))).toEqual([])
  })
})

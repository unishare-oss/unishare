import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { ReactNode } from 'react'
import { THEME_COOKIE } from '@unishare-oss/unitheme'

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: getCookie }) }))
vi.mock('next/font/google', () => ({
  Space_Grotesk: () => ({ variable: 'space-grotesk' }),
  Fira_Code: () => ({ variable: 'fira-code' }),
}))
vi.mock('next/script', () => ({ default: () => null }))
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }))
vi.mock('@/src/providers', () => ({
  Providers: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children, initialTheme }: { children: ReactNode; initialTheme?: string }) => (
    <div data-initial-theme={initialTheme}>{children}</div>
  ),
}))

import RootLayout from './layout'

describe('server-rendered theme', () => {
  beforeEach(() => {
    getCookie.mockReset()
  })

  it('renders the validated cookie palette and passes the same seed to the provider', async () => {
    getCookie.mockReturnValue({ value: 'theme-nord' })
    const html = renderToString(await RootLayout({ children: <p>App</p> }))
    expect(getCookie).toHaveBeenCalledWith(THEME_COOKIE)
    expect(html).toContain('<html lang="en" class="theme-nord dark">')
    expect(html).toContain('data-initial-theme="theme-nord"')
    expect(html).not.toContain('localStorage.getItem')
  })

  it('does not add the dark class to light palettes', async () => {
    getCookie.mockReturnValue({ value: 'theme-sakura' })
    expect(renderToString(await RootLayout({ children: null }))).toContain(
      '<html lang="en" class="theme-sakura">',
    )
  })

  it.each([undefined, 'theme-fake', 'theme-nord dark', '<script>alert(1)</script>'])(
    'defaults safely for absent or invalid cookies: %s',
    async (value) => {
      getCookie.mockReturnValue(value === undefined ? undefined : { value })
      const html = renderToString(await RootLayout({ children: null }))
      expect(html).toContain('<html lang="en" class="theme-unishare">')
      expect(html).not.toContain('data-initial-theme=')
      expect(html).not.toContain('alert(1)')
    },
  )
})

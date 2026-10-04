import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { ThemeProvider, ThemePicker } from '@unishare-oss/unitheme/react'
import { THEME_COOKIE, type ThemeAdapter } from '@unishare-oss/unitheme'

beforeEach(() => {
  // Node 26's native localStorage can shadow jsdom's storage unless a backing file is supplied.
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
  })
  document.documentElement.className = ''
  document.cookie = `${THEME_COOKIE}=; Max-Age=0; Path=/`
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('shared theme integration', () => {
  it('hydrates the server theme without a bootstrap or localStorage overriding it', async () => {
    localStorage.setItem('theme', 'theme-sakura')
    document.documentElement.className = 'theme-nord dark'
    const tree = (
      <StrictMode>
        <ThemeProvider initialTheme="theme-nord" persistCookie>
          <ThemePicker />
        </ThemeProvider>
      </StrictMode>
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root!: ReturnType<typeof hydrateRoot>
    try {
      await act(async () => {
        root = hydrateRoot(container, tree, { onRecoverableError })
      })
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Nord' })).toHaveAttribute('aria-pressed', 'true')
      expect(document.documentElement).toHaveClass('theme-nord', 'dark')
      expect(document.cookie).toContain(`${THEME_COOKIE}=theme-nord`)
      expect(localStorage.getItem('theme')).toBe('theme-sakura')
      fireEvent.click(screen.getByRole('button', { name: 'Sakura' }))
      expect(document.cookie).toContain(`${THEME_COOKIE}=theme-sakura`)
    } finally {
      await act(async () => {
        root?.unmount()
      })
      container.remove()
    }
  })

  it('preserves the displayed server theme while the initial account preference loads', () => {
    const adapter: ThemeAdapter = { load: () => new Promise(() => {}), save: vi.fn(async () => {}) }
    render(
      <ThemeProvider initialTheme="theme-nord" persistCookie account={{ id: 'user-1', adapter }}>
        <ThemePicker />
      </ThemeProvider>,
    )
    expect(document.documentElement).toHaveClass('theme-nord', 'dark')
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('treats initialTheme as a seed, so rerendering does not reset a selection', () => {
    const { rerender } = render(
      <ThemeProvider initialTheme="theme-nord" persistCookie>
        <ThemePicker />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sakura' }))
    rerender(
      <ThemeProvider initialTheme="theme-dracula" persistCookie>
        <ThemePicker />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.cookie).toContain(`${THEME_COOKIE}=theme-sakura`)
  })

  it('migrates legacy guest storage to the display cookie when there was no server seed', () => {
    localStorage.setItem('theme', 'theme-nord')
    render(
      <ThemeProvider persistCookie>
        <ThemePicker />
      </ThemeProvider>,
    )
    expect(document.cookie).toContain(`${THEME_COOKIE}=theme-nord`)
  })

  it('restores legacy guest preferences and renders all twelve accessible choices', async () => {
    localStorage.setItem('theme', 'theme-nord')
    render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect(screen.getByRole('button', { name: 'Nord' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveClass('theme-nord', 'dark')
    fireEvent.click(screen.getByRole('button', { name: 'Sakura' }))
    expect(document.documentElement).toHaveClass('theme-sakura')
    expect(document.documentElement).not.toHaveClass('dark', 'theme-nord')
    expect(localStorage.getItem('theme')).toBe('theme-sakura')
  })

  it('uses the account preference without uploading a previous visitor’s theme', async () => {
    localStorage.setItem('theme', 'theme-dracula')
    const adapter: ThemeAdapter = {
      load: vi.fn(async () => 'theme-sakura' as const),
      save: vi.fn(async () => {}),
    }
    render(
      <ThemeProvider account={{ id: 'user-1', adapter }}>
        <ThemePicker />
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(adapter.save).not.toHaveBeenCalled()
    expect(localStorage.getItem('theme')).toBe('theme-dracula')
    expect(localStorage.getItem('unicorp-theme:user:user-1')).toBe('theme-sakura')
    fireEvent.click(screen.getByRole('button', { name: 'Nord' }))
    await waitFor(() =>
      expect(adapter.save).toHaveBeenCalledWith('theme-nord', expect.any(AbortSignal)),
    )
  })

  it('an account with no saved preference uses the default, not a prior guest preference', async () => {
    localStorage.setItem('theme', 'theme-dracula')
    const adapter: ThemeAdapter = { load: vi.fn(async () => null), save: vi.fn(async () => {}) }
    render(
      <ThemeProvider account={{ id: 'user-2', adapter }}>
        <ThemePicker />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved across'))
    expect(screen.getByRole('button', { name: 'UniShare' })).toHaveAttribute('aria-pressed', 'true')
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('shows failed saves and retries while preserving the local preview', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const adapter: ThemeAdapter = { load: async () => null, save }
    render(
      <ThemeProvider account={{ id: 'user-1', adapter }}>
        <ThemePicker />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved across'))
    fireEvent.click(screen.getByRole('button', { name: 'Nord' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible())
    expect(document.documentElement).toHaveClass('theme-nord')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved across'))
    expect(save).toHaveBeenCalledTimes(2)
  })
})

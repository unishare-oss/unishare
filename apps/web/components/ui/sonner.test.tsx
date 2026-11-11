import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from './sonner'

afterEach(() => {
  toast.dismiss()
})

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

// A colour token's hex value inside one theme block (`:root:root` light, `:root:root.dark` dark).
function token(block: ':root:root' | ':root:root.dark', name: string): string {
  const start = css.indexOf(`${block} {`)
  const body = css.slice(start, css.indexOf('}', start))
  const match = body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`--${name} not found in ${block}`)
  return match[1]
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

// `fg` at `alpha` over `bg`, as a solid hex colour.
function mix(fg: string, bg: string, alpha: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16)
  const out = [1, 3, 5].map((i) =>
    Math.round(channel(fg, i) * alpha + channel(bg, i) * (1 - alpha)),
  )
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Toaster (ink toast)', () => {
  it('shows success, error, loading and warning toasts on the hero ground', async () => {
    render(<Toaster />)

    toast.success('Saved to your notes')
    toast.error('Could not send')
    toast.loading('Uploading')
    toast.warning('Almost full')

    for (const message of ['Saved to your notes', 'Could not send', 'Uploading', 'Almost full']) {
      const text = await screen.findByText(message)
      const className = text.closest('[data-sonner-toast]')?.className ?? ''
      expect(className).toContain('bg-hero')
      expect(className).toContain('text-on-hero')
    }
  })

  it('turns off the default toast styles, so the toast classes set padding, gap and type', async () => {
    render(<Toaster />)
    toast.success('Saved to your notes')

    const toastEl = (await screen.findByText('Saved to your notes')).closest('[data-sonner-toast]')
    // Sonner's padding, gap, type size and shadow rules only apply when data-styled is "true".
    expect(toastEl).toHaveAttribute('data-styled', 'false')
    // The README's .toast values: padding 10px 12px 10px 16px, gap 12px, 14px type, 500 weight.
    const className = toastEl?.className ?? ''
    for (const cls of [
      'py-2.5',
      'pr-3',
      'pl-4',
      'gap-3',
      'text-sm',
      'font-medium',
      'rounded-[14px]',
    ]) {
      expect(className.split(' ')).toContain(cls)
    }
  })

  it('runs the undo action when it is pressed', async () => {
    const onUndo = vi.fn()
    render(<Toaster />)

    toast.success('Removed from saved', { action: { label: 'Undo', onClick: onUndo } })
    // fireEvent, not userEvent: Sonner's pointer handlers need setPointerCapture, which jsdom lacks.
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(onUndo).toHaveBeenCalledTimes(1))
  })

  it('gives the cancel button a visible outline and label', async () => {
    render(<Toaster />)
    toast.success('Saved', { cancel: { label: 'Dismiss', onClick: () => {} } })
    const button = await screen.findByRole('button', { name: 'Dismiss' })
    expect(button.className).toContain('border-on-hero/60')
    expect(button.className).toContain('bg-transparent')
    expect(button.className).toContain('text-on-hero')
  })

  it.each(['light', 'dark'] as const)(
    'icon colours pass 3:1 on the hero ground in %s mode',
    (theme) => {
      const block = theme === 'light' ? ':root:root' : ':root:root.dark'
      const hero = token(block, 'hero')
      // Each icon colour the toast uses: success ok, warning brand, error bad, info ice.
      for (const name of ['ok', 'brand', 'bad', 'ice']) {
        expect(contrast(token(block, name), hero), name).toBeGreaterThanOrEqual(3)
      }
      expect(contrast(token(block, 'on-hero'), hero)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(['light', 'dark'] as const)(
    'cancel outline (on-hero at 60%) passes 3:1 and the label 4.5:1 on the hero ground in %s mode',
    (theme) => {
      const block = theme === 'light' ? ':root:root' : ':root:root.dark'
      const hero = token(block, 'hero')
      // The border is on-hero at 60% alpha over the hero ground (Tailwind border-on-hero/60).
      const outline = mix(token(block, 'on-hero'), hero, 0.6)
      expect(contrast(outline, hero), 'border').toBeGreaterThanOrEqual(3)
      expect(contrast(token(block, 'on-hero'), hero), 'label').toBeGreaterThanOrEqual(4.5)
    },
  )
})

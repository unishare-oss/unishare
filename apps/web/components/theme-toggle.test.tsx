import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/theme-toggle'

const mocks = vi.hoisted(() => ({ theme: 'theme-unishare' as string, setTheme: vi.fn() }))

vi.mock('@unishare-oss/unitheme/react', () => ({
  useTheme: () => ({
    theme: mocks.theme,
    setTheme: (id: string) => {
      mocks.theme = id
      mocks.setTheme(id)
    },
  }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    mocks.theme = 'theme-unishare'
    mocks.setTheme.mockClear()
  })

  it('switches from light to dark and back between the two ids', async () => {
    const { rerender } = render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(mocks.setTheme).toHaveBeenLastCalledWith('theme-catppuccin-mocha')
    rerender(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(mocks.setTheme).toHaveBeenLastCalledWith('theme-unishare')
  })

  it('does not remember anything in storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
})

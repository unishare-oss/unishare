import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceCard } from '@/components/profile/appearance-card'

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

describe('AppearanceCard theme choice', () => {
  beforeEach(() => {
    mocks.theme = 'theme-unishare'
    mocks.setTheme.mockClear()
  })

  it('offers only Light and Dark', () => {
    render(<AppearanceCard />)
    const group = within(screen.getByRole('group', { name: 'Theme' }))
    expect(group.getAllByRole('button').map((b) => b.textContent)).toEqual(['Light', 'Dark'])
    expect(screen.queryByRole('button', { name: 'Nord' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sakura' })).not.toBeInTheDocument()
  })

  it('switches theme', async () => {
    const { rerender } = render(<AppearanceCard />)
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(mocks.setTheme).toHaveBeenLastCalledWith('theme-catppuccin-mocha')
    rerender(<AppearanceCard />)
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  })
})

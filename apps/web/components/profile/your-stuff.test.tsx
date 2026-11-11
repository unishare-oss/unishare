import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YourStuff } from '@/components/profile/your-stuff'

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ session: { user: { role: 'STUDENT' } } }),
}))
vi.mock('@unishare-oss/unitheme/react', () => ({
  useTheme: () => ({ theme: 'theme-unishare', setTheme: vi.fn() }),
}))
vi.mock('@/components/feedback/feedback-dialog', () => ({ FeedbackDialog: () => null }))

describe('Your stuff on phones', () => {
  it('lists Appearance and the theme toggle in the phone-only block', () => {
    render(<YourStuff />)
    const appearance = screen.getByRole('link', { name: 'Appearance' })
    expect(appearance).toHaveAttribute('href', '/appearance')
    expect(appearance.parentElement).toHaveClass('md:hidden')
    const toggle = screen.getByRole('button', { name: 'Switch to dark theme' })
    expect(toggle.parentElement).toHaveClass('md:hidden')
  })
})

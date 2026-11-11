import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/shared/page-header'

describe('PageHeader', () => {
  it('sticks below the phone top bar, not under it', () => {
    render(<PageHeader title="Requests" />)
    expect(screen.getByRole('banner')).toHaveClass('sticky', 'top-[var(--mobile-topbar-h,0px)]')
  })
})

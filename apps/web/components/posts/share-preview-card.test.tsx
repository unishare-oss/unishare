import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SharePreviewCard } from './share-preview-card'

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: { name: 'Mya T.' } }) }))

const base = {
  postType: 'NOTE' as const,
  title: '',
  moduleNum: '3',
  examYear: '',
  isAnonymous: false,
}

describe('SharePreviewCard', () => {
  it('updates as fields change', () => {
    const { rerender } = render(
      <SharePreviewCard values={base} courseCode="CSC213" fileCount={1} />,
    )
    expect(screen.getByText('Your title shows here')).toBeInTheDocument()
    expect(screen.getByText(/Mya T\./)).toBeInTheDocument()
    expect(screen.getByText('MT')).toBeInTheDocument()

    rerender(
      <SharePreviewCard
        values={{ ...base, title: 'Heaps', postType: 'OLD_QUESTION', isAnonymous: true }}
        courseCode="CSC213"
        fileCount={2}
      />,
    )
    expect(screen.getByText('Heaps')).toBeInTheDocument()
    expect(screen.getAllByText('Old exam').length).toBeGreaterThan(0)
    expect(screen.getByText(/A classmate/)).toBeInTheDocument()
    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.queryByText('MT')).not.toBeInTheDocument()
    expect(screen.getByText(/2 files/)).toBeInTheDocument()
  })
})

import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionTextarea } from '@/components/post-detail/mention-textarea'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/src/lib/api/generated/follows/follows', () => ({
  useFollowsControllerGetMentionable: (params: { q?: string }, options: { query: any }) => {
    mocks.query(params, options.query.enabled)
    const all = [
      { id: 'u1', name: 'Jane Doe', image: null },
      { id: 'u2', name: 'Jake Roe', image: null },
    ]
    const q = (params.q ?? '').toLowerCase()
    const data = options.query.enabled
      ? all.filter((u) => u.name.toLowerCase().startsWith(q))
      : undefined
    return { data: data && options.query.select({ data }) }
  },
}))

function Harness({ onPick }: { onPick: (p: { id: string; name: string }) => void }) {
  const [value, setValue] = useState('')
  return <MentionTextarea value={value} onValueChange={setValue} onPick={onPick} />
}

describe('MentionTextarea', () => {
  beforeEach(() => mocks.query.mockClear())

  it('shows suggestions for @ja and Enter inserts the name and reports the pick', async () => {
    const onPick = vi.fn()
    render(<Harness onPick={onPick} />)
    const box = screen.getByRole('combobox')

    await userEvent.type(box, 'hi @ja')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(mocks.query).toHaveBeenLastCalledWith({ q: 'ja' }, true)

    await userEvent.keyboard('{Enter}')

    expect(box).toHaveValue('hi @Jane Doe ')
    expect(onPick).toHaveBeenCalledWith({ id: 'u1', name: 'Jane Doe' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ArrowDown moves the highlight and Tab picks that person', async () => {
    const onPick = vi.fn()
    render(<Harness onPick={onPick} />)
    await userEvent.type(screen.getByRole('combobox'), '@ja{ArrowDown}{Tab}')
    expect(onPick).toHaveBeenCalledWith({ id: 'u2', name: 'Jake Roe' })
  })

  it('a click picks a person', async () => {
    const onPick = vi.fn()
    render(<Harness onPick={onPick} />)
    await userEvent.type(screen.getByRole('combobox'), '@ja')
    await userEvent.click(screen.getByRole('option', { name: /Jake Roe/ }))
    expect(screen.getByRole('combobox')).toHaveValue('@Jake Roe ')
    expect(onPick).toHaveBeenCalledWith({ id: 'u2', name: 'Jake Roe' })
  })

  it('Escape closes the list', async () => {
    render(<Harness onPick={vi.fn()} />)
    await userEvent.type(screen.getByRole('combobox'), '@ja')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows nothing and does not query without an @ before the caret', async () => {
    render(<Harness onPick={vi.fn()} />)
    await userEvent.type(screen.getByRole('combobox'), 'email@x.com')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(mocks.query).toHaveBeenLastCalledWith({ q: undefined }, false)
  })
})

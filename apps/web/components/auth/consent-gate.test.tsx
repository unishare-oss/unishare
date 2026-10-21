import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentGate } from './consent-gate'

const connect = vi.fn()
const signOut = vi.fn()
vi.mock('@/src/lib/auth/uniauth', () => ({ signInWithUniauth: (value: unknown) => connect(value) }))
vi.mock('@/src/lib/auth/sign-out', () => ({ signOut: () => signOut() }))

beforeEach(() => {
  sessionStorage.clear()
  connect.mockResolvedValue(undefined)
})
afterEach(() => vi.clearAllMocks())

describe('ConsentGate', () => {
  it('refreshes through UniAuth instead of accepting terms in the app', async () => {
    render(<ConsentGate />)
    await waitFor(() => expect(connect).toHaveBeenCalledWith({ returnTo: window.location.href }))
    expect(screen.queryByRole('button', { name: 'I agree' })).not.toBeInTheDocument()
  })
  it('stops repeated redirects and lets the user retry', async () => {
    sessionStorage.setItem('unishare:shared-terms-refresh', '1')
    render(<ConsentGate />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm')
    expect(connect).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(connect).toHaveBeenCalledTimes(1)
  })
  it('offers sign-out if UniAuth cannot be reached', async () => {
    connect.mockRejectedValue(new Error('network'))
    render(<ConsentGate />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateRoomDialog } from './create-room-dialog'
import {
  decryptRoomKey,
  exportPublicKey,
  exportRoomKeyRaw,
  generateKeyPair,
} from '@/src/lib/crypto'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setKey: vi.fn(),
  error: vi.fn(),
  user: { publicKey: null as string | null },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/lib/store', () => ({
  useBoardKeysStore: { getState: () => ({ setKey: mocks.setKey }) },
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('board creation', () => {
  it('saves an owner-wrapped key and opens with the same key in the fragment', async () => {
    const account = await generateKeyPair()
    mocks.user.publicKey = await exportPublicKey(account.publicKey)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { slug: 'new-board' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<CreateRoomDialog open onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create board' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const key = await decryptRoomKey(body.encryptedOwnerKey, account.privateKey)
    const raw = await exportRoomKeyRaw(key)
    expect(mocks.setKey).toHaveBeenCalledWith('new-board', raw)
    expect(mocks.push).toHaveBeenCalledWith(`/canvas/new-board#key=${raw}`)
    expect(fetchMock.mock.calls[0][1].body).not.toContain(raw)
  })

  it('creates no room until the account encryption key is available', async () => {
    mocks.user.publicKey = null
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<CreateRoomDialog open onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create board' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})

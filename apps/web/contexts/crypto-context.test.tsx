import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CryptoProvider } from '@/contexts/crypto-context'
import { useCrypto } from '@/hooks/use-crypto'
import { getPrivateKey, PRIVATE_KEY_CHANGED_EVENT } from '@/src/lib/indexeddb'

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('@/src/lib/indexeddb', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/indexeddb')>()),
  getPrivateKey: vi.fn(),
}))

const mockedGetPrivateKey = vi.mocked(getPrivateKey)

function HasPrivateKey() {
  const { hasPrivateKey } = useCrypto()
  return <p>{hasPrivateKey ? 'has key' : 'no key'}</p>
}

function renderProvider() {
  render(
    <CryptoProvider>
      <HasPrivateKey />
    </CryptoProvider>,
  )
}

describe('CryptoProvider hasPrivateKey', () => {
  beforeEach(() => {
    mockedGetPrivateKey.mockReset()
  })

  it('turns true when a key is stored after mount, without a reload', async () => {
    mockedGetPrivateKey.mockResolvedValue(null)
    renderProvider()
    await waitFor(() => expect(mockedGetPrivateKey).toHaveBeenCalledTimes(1))
    expect(screen.getByText('no key')).toBeInTheDocument()

    mockedGetPrivateKey.mockResolvedValue({} as CryptoKey)
    act(() => {
      window.dispatchEvent(new Event(PRIVATE_KEY_CHANGED_EVENT))
    })

    expect(await screen.findByText('has key')).toBeInTheDocument()
  })

  it('turns false when the key is cleared', async () => {
    mockedGetPrivateKey.mockResolvedValue({} as CryptoKey)
    renderProvider()
    expect(await screen.findByText('has key')).toBeInTheDocument()

    mockedGetPrivateKey.mockResolvedValue(null)
    act(() => {
      window.dispatchEvent(new Event(PRIVATE_KEY_CHANGED_EVENT))
    })

    expect(await screen.findByText('no key')).toBeInTheDocument()
  })

  it('ignores an older read that resolves after a newer one', async () => {
    let resolveFirst: (key: CryptoKey | null) => void = () => {}
    mockedGetPrivateKey
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({} as CryptoKey)
    renderProvider()

    act(() => {
      window.dispatchEvent(new Event(PRIVATE_KEY_CHANGED_EVENT))
    })
    expect(await screen.findByText('has key')).toBeInTheDocument()

    await act(async () => resolveFirst(null))
    expect(screen.getByText('has key')).toBeInTheDocument()
  })
})

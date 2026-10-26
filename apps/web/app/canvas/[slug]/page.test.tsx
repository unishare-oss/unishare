import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createJSONStorage } from 'zustand/middleware'
import CanvasPage from './page'
import { useBoardKeysStore } from '@/lib/store'
import { getPrivateKey } from '@/src/lib/indexeddb'
import { encryptElement } from '@/src/lib/board-crypto'
import {
  decryptRoomKey,
  encryptRoomKey,
  exportRoomKeyRaw,
  generateKeyPair,
  generateRoomKey,
} from '@/src/lib/crypto'

const socket = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => unknown>(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, handler: (payload: unknown) => unknown) =>
      socket.handlers.set(event, handler),
    emit: socket.emit,
    connect: socket.connect,
    disconnect: socket.disconnect,
  }),
}))
vi.mock('next/navigation', () => ({ useParams: () => ({ slug: 'test-board' }) }))
vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="canvas" /> }))
vi.mock('@/src/components/canvas/canvas-header', () => ({ CanvasHeader: () => null }))
vi.mock('@/src/components/canvas/cursor-overlay', () => ({ CursorOverlay: () => null }))
vi.mock('@/src/lib/indexeddb', () => ({ getPrivateKey: vi.fn() }))
vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), dismiss: vi.fn(), success: vi.fn() },
}))

let account: CryptoKeyPair
let boardKey: CryptoKey
let wrongKey: CryptoKey
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.clearAllMocks()
  socket.handlers.clear()
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  })
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn() })
  useBoardKeysStore.persist.setOptions({ storage: createJSONStorage(() => localStorage) })
  useBoardKeysStore.setState({ keysBySlug: {} })
  account = await generateKeyPair()
  boardKey = await generateRoomKey()
  wrongKey = await generateRoomKey()
  vi.mocked(getPrivateKey).mockResolvedValue(account.privateKey)
  window.history.replaceState(
    null,
    '',
    `/canvas/test-board#key=${await exportRoomKeyRaw(boardKey)}`,
  )
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function join(encryptedOwnerKey?: string, userId = 'owner') {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        encrypted: true,
        ownerId: 'owner',
        userId,
        encryptedOwnerKey,
      },
    }),
  })
  render(<CanvasPage />)
  await waitFor(() => expect(socket.handlers.has('room-joined')).toBe(true))
}

async function receive(event: string, elements: unknown[]) {
  await act(async () => {
    await socket.handlers.get(event)?.(event === 'room-joined' ? { elements, files: [] } : elements)
  })
}

const patches = () => fetchMock.mock.calls.filter(([, options]) => options.method === 'PATCH')

describe('verified board key backups', () => {
  it('does not overwrite the cache or create a backup for a valid but incorrect fragment', async () => {
    const original = await exportRoomKeyRaw(boardKey)
    useBoardKeysStore.getState().setKey('test-board', original)
    window.location.hash = `#key=${await exportRoomKeyRaw(wrongKey)}`
    await join()
    await receive('room-joined', [
      await encryptElement({ id: '1', version: 1, text: 'secret' }, boardKey),
    ])
    expect(screen.getByText('This board is encrypted')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
    expect(useBoardKeysStore.getState().getKey('test-board')).toBe(original)
  })

  it('repairs an incorrect existing backup only after decrypting the board', async () => {
    await join(await encryptRoomKey(wrongKey, account.publicKey))
    expect(patches()).toHaveLength(0)
    await receive('room-joined', [
      await encryptElement({ id: '1', version: 1, text: 'secret' }, boardKey),
    ])
    await waitFor(() => expect(patches()).toHaveLength(1))
    const wrapped = JSON.parse(patches()[0][1].body).encryptedOwnerKey
    const restored = await decryptRoomKey(wrapped, account.privateKey)
    expect(await exportRoomKeyRaw(restored)).toBe(await exportRoomKeyRaw(boardKey))
    expect(useBoardKeysStore.getState().getKey('test-board')).toBe(await exportRoomKeyRaw(boardKey))
  })

  it('does not trust an incoming update before the initial board has decrypted', async () => {
    window.location.hash = `#key=${await exportRoomKeyRaw(wrongKey)}`
    const snapshot = [await encryptElement({ id: 'original', version: 1 }, boardKey)]
    const update = [await encryptElement({ id: 'injected', version: 1 }, wrongKey)]
    let rejectSnapshot!: (reason: Error) => void
    vi.spyOn(crypto.subtle, 'decrypt').mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSnapshot = reject
        }),
    )
    await join()
    await act(async () => {
      const pending = socket.handlers.get('room-joined')?.({ elements: snapshot, files: [] })
      await socket.handlers.get('scene-update')?.(update)
      expect(useBoardKeysStore.getState().getKey('test-board')).toBeUndefined()
      expect(patches()).toHaveLength(0)
      rejectSnapshot(new Error('Incorrect key'))
      await pending
    })
    expect(screen.getByText('This board is encrypted')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
  })

  it('does not replace an existing backup when board decryption fails', async () => {
    window.location.hash = `#key=${await exportRoomKeyRaw(wrongKey)}`
    await join(await encryptRoomKey(wrongKey, account.publicKey))
    await receive('room-joined', [await encryptElement({ id: '1', version: 1 }, boardKey)])
    expect(patches()).toHaveLength(0)
    expect(useBoardKeysStore.getState().getKey('test-board')).toBeUndefined()
  })

  it('defers empty-board backups until encrypted content arrives, then saves only once', async () => {
    await join()
    await receive('room-joined', [])
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
    expect(useBoardKeysStore.getState().getKey('test-board')).toBeUndefined()
    const elements = [await encryptElement({ id: '1', version: 1 }, boardKey)]
    await receive('scene-update', elements)
    await waitFor(() => expect(patches()).toHaveLength(1))
    await receive('scene-update', elements)
    expect(patches()).toHaveLength(1)
  })

  it('caches a verified guest key without attempting an owner backup', async () => {
    await join(undefined, 'guest')
    await receive('room-joined', [await encryptElement({ id: '1', version: 1 }, boardKey)])
    await waitFor(() => expect(useBoardKeysStore.getState().getKey('test-board')).toBeDefined())
    expect(getPrivateKey).not.toHaveBeenCalled()
    expect(patches()).toHaveLength(0)
  })
})

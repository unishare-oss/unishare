import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import {
  generateRoomKey,
  exportRoomKeyRaw,
  generateKeyPair,
  encryptRoomKey,
  decryptRoomKey,
} from '@/src/lib/crypto'
import { getPrivateKey } from '@/src/lib/indexeddb'
import { useBoardKeysStore } from '@/lib/store'
import { createJSONStorage } from 'zustand/middleware'
import {
  encryptElement,
  decryptElement,
  getRoomKeyFromHash,
  getRoomKeyFromLocation,
  appendRoomKeyToPath,
  encryptImageDataUrl,
  decryptImageToDataUrl,
  backupOwnerRoomKey,
} from './board-crypto'

vi.mock('@/src/lib/indexeddb', () => ({ getPrivateKey: vi.fn() }))

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  })
  useBoardKeysStore.persist.setOptions({ storage: createJSONStorage(() => localStorage) })
  useBoardKeysStore.setState({ keysBySlug: {} })
  window.history.replaceState(null, '', '/canvas/test-board')
  vi.mocked(getPrivateKey).mockReset()
})

afterEach(() => vi.unstubAllGlobals())

describe('element hybrid encryption', () => {
  it('round-trips a full Excalidraw-shaped element, keeping id/version plaintext', async () => {
    const key = await generateRoomKey()
    const element = {
      id: 'el-1',
      version: 3,
      type: 'text',
      x: 10,
      y: 20,
      text: 'hello board',
      isDeleted: false,
    }

    const wire = await encryptElement(element, key)
    expect(wire.id).toBe('el-1')
    expect(wire.version).toBe(3)
    expect(wire.encryptedPayload).not.toContain('hello board')

    const decrypted = await decryptElement(wire, key)
    expect(decrypted).toEqual(element)
  })

  it('cannot be decrypted without the room key', async () => {
    const key = await generateRoomKey()
    const wrongKey = await generateRoomKey()
    const wire = await encryptElement({ id: 'el-1', version: 1, text: 'secret' }, key)
    await expect(decryptElement(wire, wrongKey)).rejects.toThrow()
  })
})

describe('room key URL fragment', () => {
  it('extracts the key param from a hash string', () => {
    expect(getRoomKeyFromHash('#key=abc123')).toBe('abc123')
    expect(getRoomKeyFromHash('#other=1&key=abc123')).toBe('abc123')
    expect(getRoomKeyFromHash('')).toBeNull()
    expect(getRoomKeyFromHash('#other=1')).toBeNull()
  })

  it('returns null when no key is present in window.location.hash', async () => {
    window.location.hash = ''
    expect(await getRoomKeyFromLocation('test-board')).toBeNull()
  })

  it('reads back a key placed in window.location.hash', async () => {
    const key = await generateRoomKey()
    const exported = await exportRoomKeyRaw(key)
    window.location.hash = `#key=${exported}`

    const roundTripped = await getRoomKeyFromLocation('test-board')
    expect(roundTripped).not.toBeNull()
    // Prove it's the same key by encrypting/decrypting across the two instances.
    const wire = await encryptElement({ id: '1', version: 1, note: 'x' }, key)
    await expect(decryptElement(wire, roundTripped!)).resolves.toEqual({
      id: '1',
      version: 1,
      note: 'x',
    })
    expect(useBoardKeysStore.getState().getKey('test-board')).toBeUndefined()
  })

  it('restores a cached key and repairs the URL without losing query or hash parameters', async () => {
    const raw = await exportRoomKeyRaw(await generateRoomKey())
    useBoardKeysStore.getState().setKey('test-board', raw)
    window.history.replaceState(null, '', '/canvas/test-board?source=boards#other=1')
    expect(await getRoomKeyFromLocation('test-board')).not.toBeNull()
    expect(getRoomKeyFromHash(window.location.hash)).toBe(raw)
    expect(window.location.search).toBe('?source=boards')
    expect(window.location.hash).toContain('other=1')
    window.location.hash = ''
    expect(await getRoomKeyFromLocation('unknown-board')).toBeNull()
  })

  it('uses an explicit URL key ahead of the cache and rejects malformed keys', async () => {
    const cached = await exportRoomKeyRaw(await generateRoomKey())
    const raw = await exportRoomKeyRaw(await generateRoomKey())
    useBoardKeysStore.getState().setKey('test-board', cached)
    window.location.hash = `#key=${raw}`
    expect(await getRoomKeyFromLocation('test-board')).not.toBeNull()
    expect(useBoardKeysStore.getState().getKey('test-board')).toBe(cached)
    window.location.hash = '#key=invalid'
    expect(await getRoomKeyFromLocation('test-board')).toBeNull()
    expect(useBoardKeysStore.getState().getKey('test-board')).toBe(cached)
  })

  it('recovers on another device with the restored account private key', async () => {
    const account = await generateKeyPair()
    const key = await generateRoomKey()
    const wrapped = await encryptRoomKey(key, account.publicKey)
    vi.mocked(getPrivateKey).mockResolvedValue(account.privateKey)
    const restored = await getRoomKeyFromLocation('test-board', wrapped, 'owner')
    expect(getPrivateKey).toHaveBeenCalledWith('owner')
    expect(await exportRoomKeyRaw(restored!)).toBe(await exportRoomKeyRaw(key))
    expect(getRoomKeyFromHash(window.location.hash)).toBe(await exportRoomKeyRaw(key))
  })

  it('keeps the missing-key gate when the account key is absent or wrong', async () => {
    const account = await generateKeyPair()
    const wrapped = await encryptRoomKey(await generateRoomKey(), account.publicKey)
    vi.mocked(getPrivateKey).mockResolvedValue(null)
    expect(await getRoomKeyFromLocation('test-board', wrapped, 'owner')).toBeNull()
    vi.mocked(getPrivateKey).mockResolvedValue((await generateKeyPair()).privateKey)
    expect(await getRoomKeyFromLocation('test-board', wrapped, 'owner')).toBeNull()
    expect(useBoardKeysStore.getState().getKey('test-board')).toBeUndefined()
  })

  it('backfills an owner backup using only a wrapped key and checks save failures', async () => {
    const account = await generateKeyPair()
    const key = await generateRoomKey()
    vi.mocked(getPrivateKey).mockResolvedValue(account.privateKey)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await backupOwnerRoomKey('test-board', key, 'owner')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/rooms/test-board')
    const payload = JSON.parse(options.body)
    expect(payload.encryptedOwnerKey).toHaveLength(168)
    expect(options.body).not.toContain(await exportRoomKeyRaw(key))
    const restored = await decryptRoomKey(payload.encryptedOwnerKey, account.privateKey)
    expect(await exportRoomKeyRaw(restored)).toBe(await exportRoomKeyRaw(key))
    fetchMock.mockResolvedValue({ ok: false })
    await expect(backupOwnerRoomKey('test-board', key, 'owner')).rejects.toThrow(
      'Could not back up',
    )
    vi.mocked(getPrivateKey).mockResolvedValue(null)
    await expect(backupOwnerRoomKey('test-board', key, 'owner')).rejects.toThrow('Import')
  })

  it('does not rewrite a matching owner backup', async () => {
    const account = await generateKeyPair()
    const key = await generateRoomKey()
    vi.mocked(getPrivateKey).mockResolvedValue(account.privateKey)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await backupOwnerRoomKey(
      'test-board',
      key,
      'owner',
      await encryptRoomKey(key, account.publicKey),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('appends the exported key to a path as a fragment', async () => {
    const key = await generateRoomKey()
    const url = await appendRoomKeyToPath('/canvas/abc123', key)
    expect(url).toMatch(/^\/canvas\/abc123#key=[A-Za-z0-9_-]+$/)
  })
})

describe('image encryption', () => {
  it('round-trips a small PNG-shaped data URL through encrypt/decrypt', async () => {
    const key = await generateRoomKey()
    // Doesn't need to be a real PNG — only the bytes round-trip is under test.
    const dataUrl = 'data:image/png;base64,' + btoa('fake-png-bytes-not-really-a-png')

    const encryptedBlob = await encryptImageDataUrl(dataUrl, key)
    expect(encryptedBlob.type).toBe('application/octet-stream')

    const ciphertext = await encryptedBlob.arrayBuffer()
    const decryptedDataUrl = await decryptImageToDataUrl(ciphertext, 'image/png', key)

    expect(decryptedDataUrl.startsWith('data:image/png;base64,')).toBe(true)
    const decryptedBytes = atob(decryptedDataUrl.split(',')[1])
    expect(decryptedBytes).toBe('fake-png-bytes-not-really-a-png')
  })
})

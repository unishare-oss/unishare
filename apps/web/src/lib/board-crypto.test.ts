import { describe, it, expect } from 'vitest'
import { generateRoomKey, exportRoomKeyRaw } from '@/src/lib/crypto'
import {
  encryptElement,
  decryptElement,
  getRoomKeyFromHash,
  getRoomKeyFromLocation,
  appendRoomKeyToPath,
  encryptImageDataUrl,
  decryptImageToDataUrl,
} from './board-crypto'

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
    expect(await getRoomKeyFromLocation()).toBeNull()
  })

  it('reads back a key placed in window.location.hash', async () => {
    const key = await generateRoomKey()
    const exported = await exportRoomKeyRaw(key)
    window.location.hash = `#key=${exported}`

    const roundTripped = await getRoomKeyFromLocation()
    expect(roundTripped).not.toBeNull()
    // Prove it's the same key by encrypting/decrypting across the two instances.
    const wire = await encryptElement({ id: '1', version: 1, note: 'x' }, key)
    await expect(decryptElement(wire, roundTripped!)).resolves.toEqual({
      id: '1',
      version: 1,
      note: 'x',
    })
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

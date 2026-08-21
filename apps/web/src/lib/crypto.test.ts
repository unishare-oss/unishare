import { describe, it, expect } from 'vitest'
import {
  generateRoomKey,
  exportRoomKeyRaw,
  importRoomKeyRaw,
  encryptBytes,
  decryptBytes,
  encryptMessage,
  decryptMessage,
} from './crypto'

describe('board room key (URL fragment) round trip', () => {
  it('exports and re-imports a usable AES key', async () => {
    const key = await generateRoomKey()
    const exported = await exportRoomKeyRaw(key)
    const imported = await importRoomKeyRaw(exported)

    const plaintext = 'hello board'
    const ciphertext = await encryptMessage(plaintext, key)
    expect(await decryptMessage(ciphertext, imported)).toBe(plaintext)
  })

  it('produces a URL-fragment-safe string (no +, /, or =)', async () => {
    // Run a handful of keys since a single sample may not happen to contain the risky chars.
    for (let i = 0; i < 20; i++) {
      const exported = await exportRoomKeyRaw(await generateRoomKey())
      expect(exported).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('rejects a key from a different room', async () => {
    const key = await generateRoomKey()
    const otherKey = await generateRoomKey()
    const ciphertext = await encryptMessage('secret', key)
    await expect(decryptMessage(ciphertext, otherKey)).rejects.toThrow()
  })
})

describe('encryptBytes/decryptBytes (board images)', () => {
  it('round-trips arbitrary binary data', async () => {
    const key = await generateRoomKey()
    const original = crypto.getRandomValues(new Uint8Array(1024))

    const encrypted = await encryptBytes(original.buffer, key)
    expect(encrypted.byteLength).toBe(original.byteLength + 12 + 16) // IV prefix + GCM auth tag

    const decrypted = await decryptBytes(encrypted.buffer, key)
    expect(new Uint8Array(decrypted)).toEqual(original)
  })

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const key = await generateRoomKey()
    const data = new TextEncoder().encode('same plaintext').buffer

    const a = await encryptBytes(data, key)
    const b = await encryptBytes(data, key)
    expect(a).not.toEqual(b)
  })

  it('fails to decrypt with the wrong key', async () => {
    const key = await generateRoomKey()
    const wrongKey = await generateRoomKey()
    const data = new TextEncoder().encode('board image bytes').buffer

    const encrypted = await encryptBytes(data, key)
    await expect(decryptBytes(encrypted.buffer, wrongKey)).rejects.toThrow()
  })
})

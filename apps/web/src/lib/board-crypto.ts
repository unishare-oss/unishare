import {
  encryptMessage,
  decryptMessage,
  encryptBytes,
  decryptBytes,
  exportRoomKeyRaw,
  importRoomKeyRaw,
  encryptRoomKey,
  decryptRoomKey,
  importPublicKey,
} from '@/src/lib/crypto'
import { getPrivateKey } from '@/src/lib/indexeddb'
import { useBoardKeysStore } from '@/lib/store'

/**
 * Board content is E2E encrypted with a symmetric key shared in the URL fragment (never sent
 * to the server). The owner also has a backup wrapped with their account public key; guests
 * still need the full link. See docs/board-e2e-encryption/planning.md.
 */

const ROOM_KEY_HASH_PARAM = 'key'

export interface EncryptedWireElement {
  id: string
  version: number
  encryptedPayload: string
}

/** `id`/`version` stay plaintext — the server's last-write-wins merge only reads those two. */
export async function encryptElement(
  element: Record<string, unknown>,
  key: CryptoKey,
): Promise<EncryptedWireElement> {
  const { id, version, ...rest } = element as { id: string; version: number }
  const encryptedPayload = await encryptMessage(JSON.stringify(rest), key)
  return { id, version, encryptedPayload }
}

export async function decryptElement(
  wire: EncryptedWireElement,
  key: CryptoKey,
): Promise<Record<string, unknown>> {
  const rest = JSON.parse(await decryptMessage(wire.encryptedPayload, key)) as Record<
    string,
    unknown
  >
  return { ...rest, id: wire.id, version: wire.version }
}

export function getRoomKeyFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(ROOM_KEY_HASH_PARAM)
}

/** Recover missing fragments from this browser or the owner's encrypted backup. */
export async function getRoomKeyFromLocation(
  slug: string,
  encryptedOwnerKey?: string,
  userId?: string,
): Promise<CryptoKey | null> {
  if (typeof window === 'undefined') return null
  try {
    let raw = getRoomKeyFromHash(window.location.hash) ?? useBoardKeysStore.getState().getKey(slug)
    if (!raw && encryptedOwnerKey && userId) {
      const privateKey = await getPrivateKey(userId)
      if (privateKey)
        raw = await exportRoomKeyRaw(await decryptRoomKey(encryptedOwnerKey, privateKey))
    }
    if (!raw) return null
    const key = await importRoomKeyRaw(raw)
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    hash.set(ROOM_KEY_HASH_PARAM, raw)
    url.hash = hash.toString()
    window.history.replaceState(window.history.state, '', url)
    return key
  } catch {
    return null
  }
}

/** Save or repair the owner backup only after the caller verifies board decryption. */
export async function backupOwnerRoomKey(
  slug: string,
  key: CryptoKey,
  userId: string,
  existingBackup?: string,
): Promise<void> {
  const privateKey = await getPrivateKey(userId)
  if (!privateKey)
    throw new Error('Import your encryption key in Chat Settings to back up this board.')
  if (existingBackup) {
    try {
      const savedKey = await decryptRoomKey(existingBackup, privateKey)
      if ((await exportRoomKeyRaw(savedKey)) === (await exportRoomKeyRaw(key))) return
    } catch {
      // A verified board key can repair a backup that this account can no longer decrypt.
    }
  }
  const publicJwk = await crypto.subtle.exportKey('jwk', privateKey)
  delete publicJwk.d
  const encryptedOwnerKey = await encryptRoomKey(
    key,
    await importPublicKey(JSON.stringify(publicJwk)),
  )
  const res = await fetch(`/api/rooms/${slug}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedOwnerKey }),
  })
  if (!res.ok) throw new Error('Could not back up the board key. Reopen this board to retry.')
}

/** Builds `path#key=...` for sharing — e.g. `/canvas/{slug}` or a full canvas URL. */
export async function appendRoomKeyToPath(path: string, key: CryptoKey): Promise<string> {
  return `${path}#${ROOM_KEY_HASH_PARAM}=${await exportRoomKeyRaw(key)}`
}

function dataUrlToBytes(dataUrl: string): Promise<ArrayBuffer> {
  return fetch(dataUrl).then((res) => res.arrayBuffer())
}

function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(new Blob([buffer], { type: mimeType }))
  })
}

/** Encrypts a pasted image's `dataURL` (as held in Excalidraw's BinaryFiles map) for upload. */
export async function encryptImageDataUrl(dataUrl: string, key: CryptoKey): Promise<Blob> {
  const plaintext = await dataUrlToBytes(dataUrl)
  const ciphertext = await encryptBytes(plaintext, key)
  return new Blob([ciphertext], { type: 'application/octet-stream' })
}

/** Reverses encryptImageDataUrl — used after fetching ciphertext bytes from S3. */
export async function decryptImageToDataUrl(
  ciphertext: ArrayBuffer,
  mimeType: string,
  key: CryptoKey,
): Promise<string> {
  const plaintext = await decryptBytes(ciphertext, key)
  return bufferToDataUrl(plaintext, mimeType)
}

import {
  encryptMessage,
  decryptMessage,
  encryptBytes,
  decryptBytes,
  exportRoomKeyRaw,
  importRoomKeyRaw,
} from '@/src/lib/crypto'

/**
 * Board content is E2E encrypted with a symmetric key carried in the URL fragment (never sent to
 * the server) rather than wrapped per-participant like chat — rooms have no participant table and
 * allow anonymous authors, so there's no stable identity to wrap a key to. See
 * docs/board-e2e-encryption/planning.md.
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

/** Reads the room key out of the current page's URL fragment, if present and well-formed. */
export async function getRoomKeyFromLocation(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined') return null
  const raw = getRoomKeyFromHash(window.location.hash)
  if (!raw) return null
  try {
    return await importRoomKeyRaw(raw)
  } catch {
    return null
  }
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

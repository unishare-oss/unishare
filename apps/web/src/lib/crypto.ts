const ECDH_PARAMS = {
  name: 'ECDH',
  namedCurve: 'P-256',
} as const

const AES_PARAMS = { name: 'AES-GCM', length: 256 } as const
const KEY_TRANSFER_VERSION = 1 as const
const KEY_TRANSFER_ITERATIONS = 250_000
const MIN_KEY_TRANSFER_ITERATIONS = 100_000
export const MIN_KEY_TRANSFER_PASSPHRASE_LENGTH = 8

interface EncryptedKeyTransferPayloadV1 {
  v: typeof KEY_TRANSFER_VERSION
  alg: 'PBKDF2-AES-GCM'
  i: number
  s: string
  iv: string
  ct: string
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  if (iterations < MIN_KEY_TRANSFER_ITERATIONS) {
    throw new Error('Invalid key transfer iteration count.')
  }
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer,
      iterations,
      hash: 'SHA-256',
    },
    passphraseKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  )
}

export function normalizeKeyTransferPassphrase(passphrase: string): string {
  return passphrase.trim()
}

function validateKeyTransferPassphrase(passphrase: string): string {
  const normalizedPassphrase = normalizeKeyTransferPassphrase(passphrase)
  if (normalizedPassphrase.length < MIN_KEY_TRANSFER_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_KEY_TRANSFER_PASSPHRASE_LENGTH} characters.`)
  }
  return normalizedPassphrase
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey']) as Promise<CryptoKeyPair>
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString)
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, false, [])
}

export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt'])
}

// Encrypts a room key for a recipient using ECDH + AES-GCM key wrap.
// Wire format: ephemeral public key (65 bytes raw) | IV (12 bytes) | ciphertext (48 bytes)
export async function encryptRoomKey(
  roomKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<string> {
  const ephemeral = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey'])

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeral.privateKey,
    AES_PARAMS,
    false,
    ['encrypt'],
  )

  const rawRoomKey = await crypto.subtle.exportKey('raw', roomKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, rawRoomKey)

  const epkRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey)
  const packed = new Uint8Array(65 + 12 + ciphertext.byteLength)
  packed.set(new Uint8Array(epkRaw), 0)
  packed.set(iv, 65)
  packed.set(new Uint8Array(ciphertext), 77)

  return btoa(String.fromCharCode(...packed))
}

export async function decryptRoomKey(
  encryptedKey: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const packed = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0))

  const epk = await crypto.subtle.importKey('raw', packed.slice(0, 65), ECDH_PARAMS, false, [])
  const iv = packed.slice(65, 77)
  const ciphertext = packed.slice(77)

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: epk },
    privateKey,
    AES_PARAMS,
    false,
    ['decrypt'],
  )

  const rawRoomKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext)
  return crypto.subtle.importKey('raw', rawRoomKey, AES_PARAMS, true, ['encrypt', 'decrypt'])
}

export async function encryptMessage(content: string, roomKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(content)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, roomKey, encoded)
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptMessage(ciphertext: string, roomKey: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, roomKey, data)
  return new TextDecoder().decode(decoded)
}

export async function exportPrivateKeyAsJwk(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function importPrivateKeyFromJwk(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString)
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey'])
}

/** Returns true if the private key JWK belongs to the given public key JWK string. */
export function privateKeyMatchesPublicKey(
  privateJwkString: string,
  publicJwkString: string,
): boolean {
  try {
    const priv = JSON.parse(privateJwkString)
    const pub = JSON.parse(publicJwkString)
    return priv.x === pub.x && priv.y === pub.y
  } catch {
    return false
  }
}

export async function encryptPrivateKeyTransferPayload(
  privateKeyJwk: string,
  passphrase: string,
): Promise<string> {
  const normalizedPassphrase = validateKeyTransferPassphrase(passphrase)

  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>
  const key = await derivePassphraseKey(normalizedPassphrase, salt, KEY_TRANSFER_ITERATIONS)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(privateKeyJwk),
  )

  const payload: EncryptedKeyTransferPayloadV1 = {
    v: KEY_TRANSFER_VERSION,
    alg: 'PBKDF2-AES-GCM',
    i: KEY_TRANSFER_ITERATIONS,
    s: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(encrypted)),
  }
  return JSON.stringify(payload)
}

export async function decryptPrivateKeyTransferPayload(
  payloadString: string,
  passphrase: string,
): Promise<string> {
  const normalizedPassphrase = validateKeyTransferPassphrase(passphrase)

  let payload: Partial<EncryptedKeyTransferPayloadV1>
  try {
    payload = JSON.parse(payloadString) as Partial<EncryptedKeyTransferPayloadV1>
  } catch {
    throw new Error('Invalid transfer payload format.')
  }
  if (
    payload.v !== KEY_TRANSFER_VERSION ||
    payload.alg !== 'PBKDF2-AES-GCM' ||
    typeof payload.i !== 'number' ||
    payload.i < MIN_KEY_TRANSFER_ITERATIONS ||
    !payload.s ||
    !payload.iv ||
    !payload.ct
  ) {
    throw new Error('Invalid transfer payload format.')
  }

  try {
    const key = await derivePassphraseKey(normalizedPassphrase, base64ToBytes(payload.s), payload.i)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
      key,
      base64ToBytes(payload.ct),
    )
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('Failed to decrypt key transfer payload', error)
    throw new Error('Could not decrypt transfer payload. Check the passphrase and try again.')
  }
}

const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
} as const

const AES_PARAMS = { name: 'AES-GCM', length: 256 } as const

export async function generateKeyPair() {
  return crypto.subtle.generateKey(RSA_PARAMS, true, [
    'encrypt',
    'decrypt',
  ]) as Promise<CryptoKeyPair>
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString)
  return crypto.subtle.importKey('jwk', jwk, RSA_PARAMS, false, ['encrypt'])
}

export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt'])
}

export async function encryptRoomKey(roomKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', roomKey)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, raw)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

export async function decryptRoomKey(
  encryptedKey: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0))
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes)
  return crypto.subtle.importKey('raw', raw, AES_PARAMS, false, ['encrypt', 'decrypt'])
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
  const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const iv = bytes.slice(0, 12)
  const data = bytes.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, roomKey, data)
  return new TextDecoder().decode(decrypted)
}

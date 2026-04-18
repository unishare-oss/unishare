'use client'

import { createContext, useRef, type ReactNode } from 'react'
import {
  decryptRoomKey,
  encryptMessage,
  decryptMessage,
  encryptRoomKey,
  importPublicKey,
  generateRoomKey,
} from '@/src/lib/crypto'
import { getPrivateKey } from '@/src/lib/indexeddb'

interface CryptoContextValue {
  loadRoomKey: (roomId: string, encryptedRoomKey: string) => Promise<void>
  encrypt: (roomId: string, content: string) => Promise<string>
  decrypt: (roomId: string, ciphertext: string) => Promise<string>
  hasRoomKey: (roomId: string) => boolean
  encryptRoomKeyForUser: (roomId: string, publicKeyJwk: string) => Promise<string>
  createEncryptedRoomKeys: (
    participants: { userId: string; publicKeyJwk: string }[],
  ) => Promise<{ userId: string; encryptedKey: string }[]>
}

export const CryptoContext = createContext<CryptoContextValue | null>(null)

export function CryptoProvider({ children }: { children: ReactNode }) {
  const roomKeys = useRef<Map<string, CryptoKey>>(new Map())

  const loadRoomKey = async (roomId: string, encryptedRoomKey: string) => {
    if (roomKeys.current.has(roomId)) return
    const privateKey = await getPrivateKey()
    if (!privateKey) throw new Error('Private key not found')
    const roomKey = await decryptRoomKey(encryptedRoomKey, privateKey)
    roomKeys.current.set(roomId, roomKey)
  }

  const encrypt = async (roomId: string, content: string) => {
    const roomKey = roomKeys.current.get(roomId)
    if (!roomKey) throw new Error('Room key not loaded')
    return encryptMessage(content, roomKey)
  }

  const decrypt = async (roomId: string, ciphertext: string) => {
    const roomKey = roomKeys.current.get(roomId)
    if (!roomKey) throw new Error('Room key not loaded')
    return decryptMessage(ciphertext, roomKey)
  }

  const hasRoomKey = (roomId: string) => roomKeys.current.has(roomId)

  const encryptRoomKeyForUser = async (roomId: string, publicKeyJwk: string) => {
    const roomKey = roomKeys.current.get(roomId)
    if (!roomKey) throw new Error('Room key not loaded')
    const publicKey = await importPublicKey(publicKeyJwk)
    return encryptRoomKey(roomKey, publicKey)
  }

  const createEncryptedRoomKeys = async (
    participants: { userId: string; publicKeyJwk: string }[],
  ) => {
    const roomKey = await generateRoomKey()
    return Promise.all(
      participants.map(async ({ userId, publicKeyJwk }) => {
        const pubKey = await importPublicKey(publicKeyJwk)
        const encryptedKey = await encryptRoomKey(roomKey, pubKey)
        return { userId, encryptedKey }
      }),
    )
  }

  return (
    <CryptoContext
      value={{
        loadRoomKey,
        encrypt,
        decrypt,
        hasRoomKey,
        encryptRoomKeyForUser,
        createEncryptedRoomKeys,
      }}
    >
      {children}
    </CryptoContext>
  )
}

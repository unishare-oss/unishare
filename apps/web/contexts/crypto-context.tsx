'use client'

import { createContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  decryptRoomKey,
  encryptMessage,
  decryptMessage,
  encryptRoomKey,
  importPublicKey,
  generateRoomKey,
} from '@/src/lib/crypto'
import { getPrivateKey } from '@/src/lib/indexeddb'
import { useAuth } from '@/contexts/auth-context'

interface CryptoContextValue {
  loadRoomKey: (roomId: string, encryptedRoomKey: string) => Promise<void>
  encrypt: (roomId: string, content: string) => Promise<string>
  decrypt: (roomId: string, ciphertext: string) => Promise<string>
  hasRoomKey: (roomId: string) => boolean
  encryptRoomKeyForUser: (roomId: string, publicKeyJwk: string) => Promise<string>
  createEncryptedRoomKeys: (
    participants: { userId: string; publicKeyJwk: string }[],
  ) => Promise<{ userId: string; encryptedKey: string }[]>
  /** Increments each time a new room key is loaded — use as a React dependency. */
  roomKeyVersion: number
  /** Whether the user has a private key stored in IndexedDB on this device. */
  hasPrivateKey: boolean
}

export const CryptoContext = createContext<CryptoContextValue | null>(null)

export function CryptoProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const roomKeys = useRef<Map<string, CryptoKey>>(new Map())
  const loadingRooms = useRef<Set<string>>(new Set())
  const [roomKeyVersion, setRoomKeyVersion] = useState(0)
  const [hasPrivateKey, setHasPrivateKey] = useState(false)

  useEffect(() => {
    if (!userId) return
    getPrivateKey(userId).then((key) => setHasPrivateKey(!!key))
  }, [userId])

  const loadRoomKey = async (roomId: string, encryptedRoomKey: string) => {
    if (roomKeys.current.has(roomId)) return
    if (loadingRooms.current.has(roomId)) return
    loadingRooms.current.add(roomId)
    try {
      if (!userId) throw new Error('User not authenticated')
      const privateKey = await getPrivateKey(userId)
      if (!privateKey) throw new Error('Private key not found')
      const roomKey = await decryptRoomKey(encryptedRoomKey, privateKey)
      roomKeys.current.set(roomId, roomKey)
      setRoomKeyVersion((v) => v + 1)
    } finally {
      loadingRooms.current.delete(roomId)
    }
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
        roomKeyVersion,
        hasPrivateKey,
      }}
    >
      {children}
    </CryptoContext>
  )
}

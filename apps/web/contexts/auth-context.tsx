'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/src/lib/auth/client'
import {
  useUsersControllerGetMe,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { generateKeyPair, exportPublicKey } from '@/src/lib/crypto'
import { getPrivateKey, storePrivateKey, clearPrivateKey } from '@/src/lib/indexeddb'

type Session = NonNullable<ReturnType<typeof authClient.useSession>['data']>

interface AuthContextValue {
  session: Session | null
  user: UserProfileEntity | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function generateAndUploadKeys(): Promise<string> {
  const { publicKey, privateKey: newPrivateKey } = await generateKeyPair()
  const publicKeyJwk = await exportPublicKey(publicKey)
  const res = await fetch('/api/users/me/public-key', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKeyJwk }),
  })
  if (!res.ok) {
    throw new Error(`Failed to upload public key: ${res.status}`)
  }
  await storePrivateKey(newPrivateKey)
  return publicKeyJwk
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const { data: user, isPending: userPending } = useUsersControllerGetMe({
    query: {
      enabled: !!session?.user,
      select: (res) => res.data,
    },
  })

  useEffect(() => {
    if (!user) return

    const init = async () => {
      const privateKey = await getPrivateKey()
      if (privateKey) return // already set up on this device

      await generateAndUploadKeys()

      // refresh the user profile so publicKey is available in the cache
      queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
    }

    init().catch(console.error)
  }, [user, queryClient])

  useEffect(() => {
    if (!sessionPending && !session) {
      clearPrivateKey().catch(console.error)
    }
  }, [session, sessionPending])

  const isLoading = sessionPending || (!!session?.user && userPending)
  const isAuthenticated = !!session?.user

  return (
    <AuthContext
      value={{
        session: session ?? null,
        user: user ?? null,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

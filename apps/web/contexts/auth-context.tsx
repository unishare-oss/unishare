'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/src/lib/auth/client'
import {
  useUsersControllerGetMe,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { generateKeyPair, exportPublicKey, isEcPublicKey } from '@/src/lib/crypto'
import { getPrivateKey, storePrivateKey } from '@/src/lib/indexeddb'
import { signInWithUniauth, silentCheckDone } from '@/src/lib/auth/uniauth'
import { ConsentGate } from '@/components/auth/consent-gate'

type Session = NonNullable<ReturnType<typeof authClient.useSession>['data']>

interface AuthContextValue {
  session: Session | null
  user: UserProfileEntity | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function generateAndUploadKeys(userId: string): Promise<string> {
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
  await storePrivateKey(newPrivateKey, userId)
  return publicKeyJwk
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const pathname = usePathname()
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
      const privateKey = await getPrivateKey(user.id)
      if (privateKey) return // already set up on this device
      if (user.publicKey && isEcPublicKey(user.publicKey)) return // EC key exists on another device — import required

      await generateAndUploadKeys(user.id)

      // refresh the user profile so publicKey is available in the cache
      queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
    }

    init().catch(console.error)
  }, [user, queryClient])

  // A signed-out visitor who is already signed in to uniauth (from another app)
  // is signed in here too — one invisible prompt=none round-trip per browser session.
  useEffect(() => {
    const user = session?.user as
      { unicorpTermsVersion?: number; unicorpTermsAcceptedAt?: unknown } | undefined
    if (user?.unicorpTermsVersion === 1 && user.unicorpTermsAcceptedAt)
      sessionStorage.removeItem('unishare:shared-terms-refresh')
    if (sessionPending || session || silentCheckDone()) return
    if (window.location.pathname.startsWith('/login')) return
    signInWithUniauth({ returnTo: window.location.href, silent: true }).catch(console.error)
  }, [session, sessionPending])

  const isLoading = sessionPending || (!!session?.user && userPending)
  const isAuthenticated = !!session?.user
  // Signed-in users need the shared UniAuth record; app-only history remains separate.
  const sessionUser = session?.user as
    | {
        isAnonymous?: boolean | null
        unicorpTermsVersion?: number | null
        unicorpTermsAcceptedAt?: Date | string | null
      }
    | undefined
  const needsConsent =
    !!sessionUser &&
    !sessionUser.isAnonymous &&
    (sessionUser.unicorpTermsVersion !== 1 || !sessionUser.unicorpTermsAcceptedAt) &&
    pathname !== '/terms' &&
    pathname !== '/privacy'

  return (
    <AuthContext
      value={{
        session: session ?? null,
        user: user ?? null,
        isLoading,
        isAuthenticated,
      }}
    >
      {needsConsent ? <ConsentGate /> : children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

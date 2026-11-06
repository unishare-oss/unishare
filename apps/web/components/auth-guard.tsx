'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useAuth } from '@/contexts/auth-context'

export function AuthGuard({
  children,
  allowGuestsOn = [],
}: {
  children: ReactNode
  /** Paths (and their subpaths) a guest may open too. */
  allowGuestsOn?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, isAuthenticated, isGuest } = useAuth()
  const guestAllowed =
    isGuest && allowGuestsOn.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const allowed = isAuthenticated || guestAllowed

  useEffect(() => {
    // A guest already has a session, and /login can't start a second guest one: they go back
    // to browsing instead, where the rail offers Sign in.
    if (!isLoading && !allowed) {
      router.replace(isGuest ? '/feed' : '/login')
    }
  }, [allowed, isGuest, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="size-16" />
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}

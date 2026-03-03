'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { authClient } from '@/src/lib/auth/client'

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="size-16" />
      </div>
    )
  }

  if (!session) return null

  return <>{children}</>
}

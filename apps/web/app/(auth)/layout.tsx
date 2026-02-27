'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/src/lib/auth/client'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/')
    }
  }, [session, isPending, router])

  if (isPending || session) return null

  return <>{children}</>
}

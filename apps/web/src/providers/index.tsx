'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryProvider } from './query-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { useUIStore } from '@/lib/store'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useUIStore.persist.rehydrate()
  }, [])

  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  )
}

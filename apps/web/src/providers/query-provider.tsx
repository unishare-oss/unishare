'use client'

import type { ReactNode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { reportMutationError, reportServerError } from '@/src/lib/api/report-server-error'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { reportServerError?: boolean }
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: reportServerError }),
        mutationCache: new MutationCache({ onError: reportMutationError }),
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

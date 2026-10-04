'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as SharedThemeProvider } from '@unishare-oss/unitheme/react'
import { createThemeAdapter, type ThemeId } from '@unishare-oss/unitheme'
import { authClient } from '@/src/lib/auth/client'

const adapter = createThemeAdapter('/api/uniauth/theme', true)

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode
  initialTheme?: ThemeId
}) {
  const { data: session } = authClient.useSession()
  const isGuest = (session?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous
  const account = session && !isGuest ? { id: session.user.id, adapter } : undefined
  return (
    <SharedThemeProvider account={account} initialTheme={initialTheme} persistCookie>
      {children}
    </SharedThemeProvider>
  )
}

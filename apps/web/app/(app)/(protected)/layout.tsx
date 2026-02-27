import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}

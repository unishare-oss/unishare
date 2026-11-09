import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  // Guests keep canvas boards and their bio; everything else here is members only.
  return <AuthGuard allowGuestsOn={['/boards', '/profile']}>{children}</AuthGuard>
}

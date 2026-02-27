import type { ReactNode } from 'react'
import { GuestGuard } from '@/components/guest-guard'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestGuard>{children}</GuestGuard>
}

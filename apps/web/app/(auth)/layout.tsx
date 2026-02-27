import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GuestGuard } from '@/components/guest-guard'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestGuard>{children}</GuestGuard>
}

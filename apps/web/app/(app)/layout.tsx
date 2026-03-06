import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: {
    default: 'Feed | Unishare',
    template: '%s | Unishare',
  },
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}

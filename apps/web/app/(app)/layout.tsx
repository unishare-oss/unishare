import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: {
    absolute: 'Feed | Unishare',
    template: '%s | Unishare',
  },
  description:
    'Browse lecture notes, past papers, and study guides shared by students on Unishare.',
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}

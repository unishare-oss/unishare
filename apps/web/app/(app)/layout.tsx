import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { ChatSocketProvider } from '@/contexts/chat-socket-context'

export const metadata: Metadata = {
  title: {
    absolute: 'Feed | Unishare',
    template: '%s | Unishare',
  },
  description:
    'Browse lecture notes, past papers, and study guides shared by students on Unishare.',
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ChatSocketProvider>
      <AppShell>{children}</AppShell>
    </ChatSocketProvider>
  )
}

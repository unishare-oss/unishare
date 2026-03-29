import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ChatLayoutShell } from '@/components/chat/chat-layout-shell'

export const metadata: Metadata = {
  title: 'Chat',
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatLayoutShell>{children}</ChatLayoutShell>
}

'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ChatSidebar } from '@/components/chat/chat-sidebar'

export function ChatLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isRoom = pathname !== '/chat'

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Mobile: ChatSidebar always in background */}
      <div className="md:hidden absolute inset-0 flex flex-col">
        <ChatSidebar />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname} className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* On mobile, slide in/out. On desktop, no transform (md:translate-x-0). */}
          <div
            className="flex-1 flex flex-col h-full md:contents"
            data-chat-direction={isRoom ? 'forward' : 'back'}
          >
            {children}
          </div>
        </div>
      </AnimatePresence>
    </div>
  )
}

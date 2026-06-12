'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { cn } from '@/lib/utils'

export function ChatLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isRoom = pathname !== '/chat'

  // Lazily request notification permission the first time the user opens chat
  // (never on app load). Fired notifications live in ChatSocketProvider.
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const selectedRoomId = isRoom ? (pathname.split('/')[2] ?? undefined) : undefined

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Mobile: ChatSidebar always in background */}
      <div className="md:hidden absolute inset-0 flex flex-col">
        <ChatSidebar />
      </div>

      {/* Desktop: room list panel next to the icon rail (previously rendered inside
          the old wide sidebar, which the slim rail replaced). */}
      <div className="hidden md:flex w-80 shrink-0 flex-col h-full overflow-hidden border-r-2 border-border-strong bg-background">
        <ChatSidebar selectedRoomId={selectedRoomId} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <div
          key={pathname}
          className={cn(
            'flex-1 flex flex-col min-w-0 h-full overflow-hidden',
            isRoom && 'bg-background relative z-10',
          )}
        >
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

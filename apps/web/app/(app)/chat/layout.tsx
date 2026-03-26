'use client'

import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { useParams } from 'next/navigation'
import { ReactNode } from 'react'

export default function ChatLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const roomId = params?.roomId as string | undefined

  return (
    <div className="flex h-screen md:h-[calc(100vh-0rem)] w-full overflow-hidden bg-background">
      {/* Middle Column: Pages (Empty state or Chat Window) */}
      <div className="flex-1 flex flex-col min-w-0 border-r">{children}</div>

      {/* Right Column: Persistent Sidebar */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <ChatSidebar selectedRoomId={roomId} />
      </div>
    </div>
  )
}

'use client'

import { ChatSidebar } from '@/components/chat/chat-sidebar'

export default function ChatPage() {
  return (
    <>
      {/* Mobile: show the full conversation list */}
      <div className="md:hidden flex-1 flex flex-col h-full">
        <ChatSidebar />
      </div>

      {/* Desktop: empty state (sidebar is in AppSidebar) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 opacity-20"
          >
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Your Messages</h3>
        <p className="text-sm max-w-[200px] mt-1">Select a conversation to start chatting.</p>
      </div>
    </>
  )
}

'use client'

import { ReactNode } from 'react'

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  )
}

'use client'

import { use } from 'react'
import { UnifiedChatWindow } from '@/components/chat/unified-chat-window'

export default function NewChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  return <UnifiedChatWindow targetUserId={userId} />
}

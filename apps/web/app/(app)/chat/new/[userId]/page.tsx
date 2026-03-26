'use client'

import { use } from 'react'
import { NewChatWindow } from '@/components/chat/new-chat-window'

export default function NewChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  return <NewChatWindow targetUserId={userId} />
}

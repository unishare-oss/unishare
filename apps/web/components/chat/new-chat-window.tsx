'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsersControllerGetById } from '@/src/lib/api/generated/users/users'
import {
  useChatControllerCreateRoom,
  useChatControllerSendMessage,
} from '@/src/lib/api/generated/chat/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User as UserIcon, Loader2 } from 'lucide-react'
import { ChatInput } from './chat-input'

interface NewChatWindowProps {
  targetUserId: string
}

export function NewChatWindow({ targetUserId }: NewChatWindowProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isInitializing, setIsInitializing] = useState(false)

  const { data: userResponse, isLoading: userLoading } = useUsersControllerGetById(targetUserId)
  const targetUser = userResponse?.data

  const { mutateAsync: createRoom } = useChatControllerCreateRoom()
  const { mutateAsync: sendMessage } = useChatControllerSendMessage()

  const handleSend = async () => {
    if (!content.trim() || isInitializing) return

    setIsInitializing(true)
    try {
      // 1. Create the DM room
      const roomRes = await createRoom({
        data: {
          type: 'DM',
          participantIds: [targetUserId],
        },
      })

      const newRoomId = roomRes.data.id

      // 2. Send the first message
      await sendMessage({
        id: newRoomId,
        data: { content, type: 'TEXT' },
      })

      // 3. Redirect to the actual room
      router.push(`/chat/${newRoomId}`)
    } catch (error) {
      console.error('Failed to start conversation:', error)
      setIsInitializing(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background pt-2">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur py-5">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-[6px]">
            <AvatarImage src={targetUser?.image || ''} />
            <AvatarFallback className="rounded-none bg-border text-foreground font-mono font-medium">
              <UserIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight">{targetUser?.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              New Conversation
            </span>
          </div>
        </div>
      </div>

      {/* Empty Messages Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Avatar className="h-20 w-20 mb-4 rounded-[6px]">
          <AvatarImage src={targetUser?.image || ''} />
          <AvatarFallback className="text-xl rounded-none bg-border text-foreground font-mono font-medium">
            {targetUser?.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{targetUser?.name}</h2>
        <p className="text-sm text-muted-foreground max-w-xs mt-2">
          This is the beginning of your conversation with {targetUser?.name}. Send a message to
          start chatting.
        </p>
      </div>

      <ChatInput
        value={content}
        onChange={setContent}
        onSend={handleSend}
        isLoading={isInitializing}
        placeholder="Say hello..."
      />
    </div>
  )
}

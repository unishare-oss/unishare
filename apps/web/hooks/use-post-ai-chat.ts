'use client'

import { useState, useCallback } from 'react'
import { usePostsControllerAiChat } from '@/src/lib/api/generated/posts/posts'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  offTopic?: boolean
}

const OFF_TOPIC_MESSAGE =
  'I can only answer questions about this document. Please ask something related to its content.'

export function usePostAiChat(postId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { mutateAsync, isPending } = usePostsControllerAiChat()

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: ChatMessage = { role: 'user', content: userText }
      const updated = [...messages, userMessage]
      setMessages(updated)

      try {
        const result = await mutateAsync({
          id: postId,
          data: {
            messages: updated.map((m) => ({ role: m.role, content: m.content })),
          },
        })

        const data = (result as any).data as { reply: string; offTopic: boolean }
        const offTopic = data.offTopic

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: offTopic ? OFF_TOPIC_MESSAGE : data.reply,
            offTopic,
          },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            offTopic: false,
          },
        ])
      }
    },
    [messages, mutateAsync, postId],
  )

  const reset = useCallback(() => setMessages([]), [])

  return { messages, sendMessage, isPending, reset }
}

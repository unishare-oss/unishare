'use client'

import { useState, useCallback, useRef } from 'react'
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
  const messagesRef = useRef<ChatMessage[]>([])
  const { mutateAsync, isPending } = usePostsControllerAiChat()

  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      messagesRef.current = next
      return next
    })
  }, [])

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: ChatMessage = { role: 'user', content: userText }
      const updated = [...messagesRef.current, userMessage]
      messagesRef.current = updated
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

        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: offTopic ? OFF_TOPIC_MESSAGE : data.reply,
            offTopic,
          },
        ])
      } catch {
        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            offTopic: false,
          },
        ])
      }
    },
    [mutateAsync, postId, updateMessages],
  )

  const reset = useCallback(() => {
    messagesRef.current = []
    setMessages([])
  }, [])

  return { messages, sendMessage, isPending, reset }
}

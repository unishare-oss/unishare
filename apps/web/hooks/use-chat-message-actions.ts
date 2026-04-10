'use client'

import { useState, useCallback, RefObject } from 'react'
import type {
  ChatMessageEntity,
  UserProfileEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useSendMessage, useEditMessage, useDeleteMessage } from './use-chat-mutations'

interface UseChatMessageActionsParams {
  roomId: string | undefined
  user: UserProfileEntity | null | undefined
  scrollToBottom: (behavior?: ScrollBehavior) => void
  messagesContainerRef: RefObject<HTMLDivElement | null>
  scrollContainerRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

export function useChatMessageActions({
  roomId,
  user,
  scrollToBottom,
  messagesContainerRef,
  scrollContainerRef,
  hasNextPage,
  fetchNextPage,
}: UseChatMessageActionsParams) {
  const [content, setContent] = useState('')
  const [editingMessage, setEditingMessage] = useState<ChatMessageEntity | null>(null)
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageEntity | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const { mutate: sendMessage } = useSendMessage({ roomId, user })
  const { mutate: editMessage } = useEditMessage({ roomId: roomId || '' })
  const { mutate: deleteMessage } = useDeleteMessage({ roomId: roomId || '' })

  const handleSend = useCallback(async () => {
    if (!content.trim() || !roomId) return
    const messageContent = content
    setContent('')

    if (editingMessage) {
      if ((editingMessage.content ?? '').trim() === messageContent.trim()) {
        setEditingMessage(null)
        return
      }
      editMessage({ id: editingMessage.id, data: { content: messageContent } })
      setEditingMessage(null)
    } else {
      sendMessage({
        id: roomId,
        data: {
          content: messageContent,
          type: 'TEXT',
          ...(replyingToMessage && { parentId: replyingToMessage.id }),
        },
      })
      setReplyingToMessage(null)
      requestAnimationFrame(() => scrollToBottom())
    }
  }, [content, roomId, editingMessage, replyingToMessage, editMessage, sendMessage, scrollToBottom])

  const handleEdit = useCallback((message: ChatMessageEntity) => {
    setEditingMessage(message)
    setReplyingToMessage(null)
    setContent(message.content || '')
  }, [])

  const handleReply = useCallback((message: ChatMessageEntity) => {
    setReplyingToMessage(message)
    setEditingMessage(null)
    setContent('')
  }, [])

  const handleDelete = useCallback((messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!messageToDelete) return
    const id = messageToDelete
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
    setDeletingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      deleteMessage({ id })
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
  }, [messageToDelete, deleteMessage])

  const handleScrollToMessage = useCallback(
    async (messageId: string) => {
      const tryScroll = (scrollDelay = 500) => {
        const el = messagesContainerRef.current?.querySelector(
          `[data-message-id="${messageId}"]`,
        ) as HTMLElement | null
        if (!el || !scrollContainerRef.current) return false
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          setHighlightedMessageId(messageId)
          setTimeout(() => setHighlightedMessageId(null), 1600)
        }, scrollDelay)
        return true
      }

      if (tryScroll()) return

      for (let attempt = 0; attempt < 5; attempt++) {
        if (!hasNextPage) break
        await fetchNextPage()
        await new Promise((resolve) => setTimeout(resolve, 250))
        if (tryScroll(700)) return
      }
    },
    [messagesContainerRef, scrollContainerRef, hasNextPage, fetchNextPage],
  )

  return {
    content,
    setContent,
    editingMessage,
    setEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
    deleteDialogOpen,
    setDeleteDialogOpen,
    highlightedMessageId,
    deletingIds,
    sendMessage,
    handleSend,
    handleEdit,
    handleReply,
    handleDelete,
    confirmDelete,
    handleScrollToMessage,
  }
}

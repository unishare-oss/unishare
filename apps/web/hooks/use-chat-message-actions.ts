'use client'

import { useState, useCallback, RefObject } from 'react'
import { toast } from 'sonner'
import type {
  ChatMessageEntity,
  UserProfileEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useSendMessage, useEditMessage, useDeleteMessage } from './use-chat-mutations'
import { useCrypto } from './use-crypto'

interface UseChatMessageActionsParams {
  roomId: string | undefined
  isEncrypted?: boolean
  user: UserProfileEntity | null | undefined
  scrollToBottom: (behavior?: ScrollBehavior) => void
  messagesContainerRef: RefObject<HTMLDivElement | null>
  scrollContainerRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

export function useChatMessageActions({
  roomId,
  isEncrypted,
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

  const { encrypt, hasRoomKey } = useCrypto()
  const { mutate: sendMessage } = useSendMessage({ roomId, user })
  const { mutate: editMessage } = useEditMessage({ roomId: roomId || '' })
  const { mutate: deleteMessage } = useDeleteMessage({ roomId: roomId || '' })

  const handleSend = useCallback(async () => {
    if (!content.trim() || !roomId) return
    const messageContent = content
    setContent('')

    const prepareContent = async (): Promise<string | null> => {
      if (!isEncrypted) return messageContent
      if (!hasRoomKey(roomId)) {
        toast.error('Encryption key not ready — please try again in a moment')
        setContent(messageContent)
        return null
      }
      return encrypt(roomId, messageContent)
    }

    if (editingMessage) {
      if ((editingMessage.content ?? '').trim() === messageContent.trim()) {
        setEditingMessage(null)
        return
      }
      const encryptedContent = await prepareContent()
      if (encryptedContent === null) return
      editMessage({ id: editingMessage.id, data: { content: encryptedContent } })
      setEditingMessage(null)
    } else {
      const encryptedContent = await prepareContent()
      if (encryptedContent === null) return
      const isLink = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i.test(messageContent)
      sendMessage({
        id: roomId,
        data: {
          content: encryptedContent,
          type: isLink ? 'LINK' : 'TEXT',
          ...(replyingToMessage && { parentId: replyingToMessage.id }),
        },
      })
      setReplyingToMessage(null)
      requestAnimationFrame(() => scrollToBottom())
    }
  }, [
    content,
    roomId,
    isEncrypted,
    editingMessage,
    replyingToMessage,
    editMessage,
    sendMessage,
    scrollToBottom,
    encrypt,
    hasRoomKey,
  ])

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

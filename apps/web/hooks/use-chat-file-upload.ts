'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import { putToPresignedUrl, sha256Base64 } from '@/src/lib/upload'
import type { useSendMessage } from './use-chat-mutations'

interface UseChatFileUploadParams {
  roomId: string | undefined
  replyingToMessage: ChatMessageEntity | null
  sendMessage: ReturnType<typeof useSendMessage>['mutate']
  setReplyingToMessage: (msg: ChatMessageEntity | null) => void
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

export function useChatFileUpload({
  roomId,
  replyingToMessage,
  sendMessage,
  setReplyingToMessage,
  scrollToBottom,
}: UseChatFileUploadParams) {
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [pendingFileFile, setPendingFileFile] = useState<File | null>(null)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const openImageModal = useCallback((file: File) => {
    setPendingImageFile(file)
    setImageModalOpen(true)
  }, [])

  const openFileModal = useCallback((file: File) => {
    setPendingFileFile(file)
    setFileModalOpen(true)
  }, [])

  // Intercept image/* items pasted from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItem = items.find((item) => item.type.startsWith('image/'))
      if (!imageItem) return
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) openImageModal(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [openImageModal])

  const handleSendImage = useCallback(
    async (file: File, caption: string) => {
      if (!roomId) return
      const mimeType = file.type
      const presignedRes = await storageControllerGetPresignedUploadUrl({
        mimeType,
        uploadType: 'image',
        purpose: 'chat-attachment',
        checksumSha256: await sha256Base64(file),
      })
      const { url, publicUrl } = presignedRes.data as { url: string; publicUrl: string }
      await putToPresignedUrl(url, file, mimeType)
      sendMessage({
        id: roomId,
        data: {
          imageUrl: publicUrl,
          ...(caption && { content: caption }),
          type: 'IMAGE',
          ...(replyingToMessage && { parentId: replyingToMessage.id }),
        },
      })
      setImageModalOpen(false)
      setPendingImageFile(null)
      setReplyingToMessage(null)
      requestAnimationFrame(() => scrollToBottom())
    },
    [roomId, replyingToMessage, sendMessage, setReplyingToMessage, scrollToBottom],
  )

  const handleSendFile = useCallback(
    async (file: File, caption: string) => {
      if (!roomId) return
      const mimeType = file.type || 'application/octet-stream'
      const presignedRes = await storageControllerGetPresignedUploadUrl({
        mimeType,
        uploadType: 'document',
        purpose: 'chat-attachment',
        checksumSha256: await sha256Base64(file),
      })
      const { url, publicUrl } = presignedRes.data as { url: string; publicUrl: string }
      await putToPresignedUrl(url, file, mimeType)
      sendMessage({
        id: roomId,
        data: {
          fileUrl: publicUrl,
          fileName: file.name,
          ...(caption && { content: caption }),
          type: 'FILE',
          ...(replyingToMessage && { parentId: replyingToMessage.id }),
        },
      })
      setFileModalOpen(false)
      setPendingFileFile(null)
      setReplyingToMessage(null)
      requestAnimationFrame(() => scrollToBottom())
    },
    [roomId, replyingToMessage, sendMessage, setReplyingToMessage, scrollToBottom],
  )

  return {
    pendingImageFile,
    imageModalOpen,
    setImageModalOpen,
    setPendingImageFile,
    pendingFileFile,
    fileModalOpen,
    setFileModalOpen,
    setPendingFileFile,
    isDragging,
    setIsDragging,
    openImageModal,
    openFileModal,
    handleSendImage,
    handleSendFile,
  }
}

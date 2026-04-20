import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type {
  ChatMessageEntity,
  ChatRoomParticipantEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import type { DeliveryStatus } from '@/hooks/use-chat-mutations'
import { renderWithLinks } from '@/lib/render-with-links'
import { Pencil, Trash2, Reply, FileIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ChatImageLightbox } from '../chat-image-lightbox'
import { DeliveryTick } from './delivery-tick'
import { SeenByPopover } from './seen-by-popover'
import { ReplyQuote } from './reply-quote'
import { LinkPreview } from './link-preview'
import { useChatControllerGetLinkPreview } from '@/src/lib/api/generated/chat/chat'

interface ChatMessageBubbleProps {
  message: ChatMessageEntity
  isMe: boolean
  showAvatar: boolean
  currentUserId?: string
  isHighlighted?: boolean
  isGroup?: boolean
  participants?: ChatRoomParticipantEntity[]
  onEdit?: (message: ChatMessageEntity) => void
  onDelete?: (messageId: string) => void
  onReply?: (message: ChatMessageEntity) => void
  onScrollToMessage?: (messageId: string) => void
}

export function ChatMessageBubble({
  message,
  isMe,
  showAvatar,
  onEdit,
  onDelete,
  onReply,
  onScrollToMessage,
  currentUserId,
  isHighlighted,
  isGroup,
  participants,
}: ChatMessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const firstUrl =
    message.type === 'LINK'
      ? message.content
      : message.type === 'TEXT' && message.content
        ? (message.content.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i)?.[0] ?? null)
        : null

  const { data: previewData, isLoading: previewLoading } = useChatControllerGetLinkPreview(
    { url: firstUrl! },
    { query: { enabled: !!firstUrl, staleTime: 1000 * 60 * 60, retry: false } },
  )
  const preview = (previewData?.data as any) ?? null
  const previewLoaded = !!preview?.title

  const isEdited =
    message.updatedAt &&
    new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000

  const parentIsMe = message.parent?.userId === currentUserId
  const parentName = parentIsMe ? 'you' : message.parent?.user?.name

  const seenBy = participants
    ? participants.filter(
        (p) =>
          p.userId !== message.userId &&
          p.lastReadAt &&
          new Date(p.lastReadAt) >= new Date(message.createdAt),
      )
    : []

  const deliveryStatus: DeliveryStatus = message.id.startsWith('temp-')
    ? 'sending'
    : seenBy.length > 0
      ? 'seen'
      : 'delivered'

  return (
    <>
      {message.imageUrl && (
        <ChatImageLightbox
          src={message.imageUrl}
          caption={message.content}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex items-end gap-2 group w-full min-w-0',
          isMe ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        {/* Sender avatar */}
        {!isMe && (
          <div className="w-8 shrink-0">
            {showAvatar && (
              <Avatar className="h-8 w-8 mb-1 rounded-[6px]">
                <AvatarImage src={message.user?.image || ''} />
                <AvatarFallback className="text-[0.625rem] rounded-none bg-border text-foreground font-mono font-medium">
                  {message.user?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        {/* Bubble column */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                'flex flex-col min-w-0 max-w-[75%] md:max-w-[60%]',
                isMe ? 'items-end' : 'items-start',
              )}
            >
              <motion.div
                animate={
                  isHighlighted
                    ? {
                        boxShadow: [
                          '0 0 0 0px color-mix(in srgb, var(--color-primary) 0%, transparent)',
                          '0 0 0 6px color-mix(in srgb, var(--color-primary) 75%, transparent)',
                          '0 0 0 4px color-mix(in srgb, var(--color-primary) 35%, transparent)',
                          '0 0 0 0px color-mix(in srgb, var(--color-primary) 0%, transparent)',
                        ],
                      }
                    : { boxShadow: '0 0 0 0px transparent' }
                }
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'text-sm rounded-2xl shadow-sm relative z-10 max-w-full overflow-hidden',
                  message.imageUrl || message.fileUrl ? 'w-full' : 'w-fit',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary text-secondary-foreground rounded-bl-sm',
                )}
              >
                {/* Inline reply quote */}
                {message.parent && (
                  <ReplyQuote
                    parent={message.parent}
                    isMe={isMe}
                    parentName={parentName}
                    onScrollToMessage={onScrollToMessage}
                  />
                )}

                {/* Image */}
                {message.imageUrl && (
                  <div
                    className="relative overflow-hidden cursor-zoom-in group/img"
                    onClick={() => setLightboxOpen(true)}
                  >
                    {!isMe && showAvatar && (
                      <span className="absolute top-2 left-3 text-[0.625rem] font-semibold text-white drop-shadow z-10">
                        {message.user?.name}
                      </span>
                    )}
                    <div className="relative max-h-52 md:max-h-72 w-full overflow-hidden">
                      <Image
                        src={message.imageUrl}
                        alt={message.content || 'Photo'}
                        width={0}
                        height={0}
                        sizes="(max-width: 640px) 70vw, 400px"
                        className="max-h-52 md:max-h-72 max-w-full object-cover w-full h-auto"
                      />
                    </div>
                    {!message.content && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[0.5625rem] text-white/80 drop-shadow px-2">
                        {isEdited && <span className="italic">(edited)</span>}
                        {isMe && <DeliveryTick status={deliveryStatus} />}
                      </div>
                    )}
                  </div>
                )}

                {/* File */}
                {message.fileUrl && (
                  <div className="relative overflow-hidden">
                    {!isMe && showAvatar && (
                      <span className="absolute top-2 left-3 text-[0.625rem] font-semibold drop-shadow z-10 opacity-70">
                        {message.user?.name}
                      </span>
                    )}
                    <a
                      href={message.fileUrl}
                      download={message.fileName ?? true}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80 w-full min-w-0',
                        isMe ? 'bg-primary-foreground/10' : 'bg-muted/50',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                          isMe
                            ? 'bg-primary-foreground/15 text-primary-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        <FileIcon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-medium truncate leading-snug">
                          {message.fileName ?? 'File'}
                        </p>
                        <p
                          className={cn(
                            'text-[0.625rem] mt-0.5',
                            isMe ? 'text-primary-foreground/50' : 'text-muted-foreground',
                          )}
                        >
                          Tap to download · deleted after 7 days
                        </p>
                      </div>
                      <Download
                        className={cn(
                          'size-4 shrink-0',
                          isMe ? 'text-primary-foreground/40' : 'text-muted-foreground/50',
                        )}
                      />
                    </a>
                  </div>
                )}

                {/* Text body — hidden for LINK messages once preview loads */}
                {!(previewLoaded && message.type === 'LINK') &&
                  (message.content || (!message.imageUrl && !message.fileUrl)) && (
                    <div className="px-4 py-2 min-w-0">
                      {!isMe && showAvatar && !message.imageUrl && !message.fileUrl && (
                        <span className="text-[0.625rem] font-semibold block mb-1 opacity-70">
                          {message.user?.name}
                        </span>
                      )}
                      {message.content && (
                        <p className="whitespace-pre-wrap break-words min-w-0">
                          {renderWithLinks(
                            message.content,
                            isMe ? 'text-primary-foreground/90' : 'text-primary',
                          )}
                          {(isMe || isEdited) && (
                            <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 translate-y-1.5">
                              {isEdited && (
                                <span
                                  className={cn(
                                    'text-[0.5rem] italic',
                                    isMe
                                      ? 'text-primary-foreground/50'
                                      : 'text-muted-foreground/60',
                                  )}
                                >
                                  edited
                                </span>
                              )}
                              {isMe && <DeliveryTick status={deliveryStatus} />}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
              </motion.div>

              {firstUrl && (
                <LinkPreview
                  url={firstUrl}
                  preview={preview}
                  isLoading={previewLoading}
                  isMe={isMe}
                  deliveryStatus={deliveryStatus}
                />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-40">
            <ContextMenuItem onClick={() => onReply?.(message)}>
              <Reply className="h-3.5 w-3.5" />
              Reply
            </ContextMenuItem>
            {isMe && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onEdit?.(message)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </ContextMenuItem>
                <ContextMenuItem variant="destructive" onClick={() => onDelete?.(message.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {/* Hover timestamp — desktop only */}
        <div
          className={cn(
            'hidden md:block self-end mb-1 shrink-0',
            isMe ? 'items-end' : 'items-start',
          )}
        >
          <span className="text-[0.625rem] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>

        {/* Desktop: hover action pill */}
        <div
          className={cn(
            'hidden md:flex opacity-0 group-hover:opacity-100 transition-all duration-150 self-end mb-1 items-center shrink-0',
            'bg-background/95 border border-border/60 rounded-full shadow-sm px-1 py-0.5 gap-0.5',
          )}
        >
          {isGroup && participants && <SeenByPopover seenBy={seenBy} isMe={isMe} />}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-accent hover:text-accent-foreground"
            title="Reply"
            onClick={() => onReply?.(message)}
          >
            <Reply className="h-3 w-3" />
          </Button>

          {isMe && (
            <>
              <div className="w-px h-3 bg-border/60 mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-accent hover:text-accent-foreground"
                title="Edit"
                onClick={() => onEdit?.(message)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Delete"
                onClick={() => onDelete?.(message.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

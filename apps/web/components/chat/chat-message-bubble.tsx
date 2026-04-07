import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { renderWithLinks } from '@/lib/render-with-links'
import { Pencil, Trash2, Reply, ImageIcon, FileIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatImageLightbox } from './chat-image-lightbox'

interface ChatMessageBubbleProps {
  message: ChatMessageEntity
  isMe: boolean
  showAvatar: boolean
  currentUserId?: string
  isHighlighted?: boolean
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
}: ChatMessageBubbleProps) {
  const isEdited =
    message.updatedAt &&
    new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000

  const parentIsMe = message.parent?.userId === currentUserId
  const parentName = parentIsMe ? 'you' : message.parent?.user?.name
  const parentText =
    message.parent?.content || (message.parent?.imageUrl ? null : 'Message deleted')

  const [lightboxOpen, setLightboxOpen] = useState(false)

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
      <div className={cn('flex items-end gap-2 group', isMe ? 'flex-row-reverse' : 'flex-row')}>
        {!isMe && (
          <div className="w-8">
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

        <div className={cn('flex flex-col max-w-[60%]', isMe ? 'items-end' : 'items-start')}>
          {/* Main Message Bubble */}
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
              'text-sm rounded-2xl shadow-sm relative z-10 w-fit max-w-full overflow-hidden',
              isMe
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-secondary text-secondary-foreground rounded-bl-sm',
            )}
          >
            {/* Inline reply quote */}
            {message.parent && (
              <div
                className={cn(
                  'flex gap-2.5 px-3 pt-2.5 pb-2 border-b transition-opacity',
                  isMe
                    ? 'bg-primary-foreground/10 border-primary-foreground/15'
                    : 'bg-accent/70 border-accent-foreground/15',
                  onScrollToMessage && message.parent?.id
                    ? 'cursor-pointer hover:opacity-80 active:opacity-60'
                    : '',
                )}
                onClick={() => message.parent?.id && onScrollToMessage?.(message.parent.id)}
              >
                {/* Left accent bar */}
                <div
                  className={cn(
                    'w-0.5 rounded-full shrink-0 self-stretch min-h-[1.75rem]',
                    isMe ? 'bg-primary-foreground/50' : 'bg-accent-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[0.5625rem] font-bold font-mono tracking-widest uppercase mb-0.5 truncate',
                      isMe ? 'text-primary-foreground/70' : 'text-accent-foreground',
                    )}
                  >
                    {parentName || 'Deleted User'}
                  </p>
                  {message.parent?.imageUrl && !message.parent?.content ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[0.6875rem] italic',
                        isMe ? 'text-primary-foreground/50' : 'text-foreground/60',
                      )}
                    >
                      <ImageIcon className="size-3 shrink-0" />
                      Photo
                    </span>
                  ) : message.parent?.fileUrl && !message.parent?.content ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[0.6875rem] italic',
                        isMe ? 'text-primary-foreground/50' : 'text-foreground/60',
                      )}
                    >
                      <FileIcon className="size-3 shrink-0" />
                      {message.parent?.fileName ?? 'File'}
                    </span>
                  ) : (
                    <p
                      className={cn(
                        'text-[0.6875rem] leading-snug italic',
                        isMe ? 'text-primary-foreground/50' : 'text-foreground/60',
                      )}
                    >
                      {(parentText?.length ?? 0) > 80 ? `${parentText!.slice(0, 80)}…` : parentText}
                    </p>
                  )}
                </div>
              </div>
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
                <div className="relative max-h-72 w-full overflow-hidden">
                  <Image
                    src={message.imageUrl}
                    alt={message.content || 'Photo'}
                    width={600}
                    height={400}
                    className="max-h-72 max-w-full object-cover w-full h-auto"
                    sizes="(max-width: 768px) 80vw, 400px"
                  />
                </div>
                {/* Timestamp overlay on image-only messages */}
                {!message.content && (
                  <div
                    className={cn(
                      'absolute bottom-1.5 flex gap-1 text-[0.5625rem] text-white/80 drop-shadow px-2',
                      isMe ? 'right-1.5' : 'left-1.5',
                    )}
                  >
                    {isMe && isEdited && <span className="italic">(edited)</span>}
                    <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
                    {!isMe && isEdited && <span className="italic">(edited)</span>}
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
                    'flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80',
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

            {/* Message body — only render if there is text content or no image/file */}
            {(message.content || (!message.imageUrl && !message.fileUrl)) && (
              <div className="px-4 py-2">
                {!isMe && showAvatar && !message.imageUrl && !message.fileUrl && (
                  <span className="text-[0.625rem] font-semibold block mb-1 opacity-70">
                    {message.user?.name}
                  </span>
                )}
                {message.content && (
                  <p className="whitespace-pre-wrap break-all">
                    {renderWithLinks(
                      message.content ?? '',
                      isMe ? 'text-primary-foreground/90' : 'text-primary',
                    )}
                  </p>
                )}

                {/* Metadata removed — timestamp shown as side tooltip on hover */}
              </div>
            )}
          </motion.div>
        </div>

        {/* Timestamp + edited — outside bubble, to the side */}
        <div
          className={cn(
            'self-end mb-1 shrink-0 flex flex-col gap-0.5',
            isMe ? 'items-end' : 'items-start',
          )}
        >
          {isEdited && (
            <span className="text-[0.5625rem] italic text-muted-foreground opacity-70">edited</span>
          )}
          <span className="text-[0.625rem] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>

        {/* Hover action pill */}
        <div
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-all duration-150 self-end mb-1 flex items-center shrink-0',
            'bg-background/95 border border-border/60 rounded-full shadow-sm px-1 py-0.5 gap-0.5',
          )}
        >
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

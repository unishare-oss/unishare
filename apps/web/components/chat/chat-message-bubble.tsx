import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { renderWithLinks } from '@/lib/render-with-links'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessageBubbleProps {
  message: ChatMessageEntity
  isMe: boolean
  showAvatar: boolean
  currentUserId?: string
  onEdit?: (message: ChatMessageEntity) => void
  onDelete?: (messageId: string) => void
  onReply?: (message: ChatMessageEntity) => void
}

export function ChatMessageBubble({
  message,
  isMe,
  showAvatar,
  onEdit,
  onDelete,
  onReply,
}: ChatMessageBubbleProps) {
  const isEdited =
    message.updatedAt &&
    new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000

  return (
    <div className={cn('flex items-end gap-2 group', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <div className="w-8">
          {showAvatar && (
            <Avatar className="h-8 w-8 mb-1 rounded-[6px]">
              <AvatarImage src={message.user?.image || ''} />
              <AvatarFallback className="text-[10px] rounded-none bg-border text-foreground font-mono font-medium">
                {message.user?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
        {/* Reply Bubble - Behind */}
        {message.parent && (
          <div className={cn('flex flex-col w-full mb-0', isMe ? 'items-end' : 'items-start')}>
            {/* Reply info - Outside the bubble */}
            <div className="flex items-center gap-1 mb-1 px-1">
              <Reply className="w-3 h-3 text-muted-foreground" />
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  isMe ? 'text-muted-foreground' : 'text-muted-foreground/80',
                )}
              >
                {message.parent.user?.name || 'Deleted User'}
              </span>
            </div>

            {/* Reply bubble content - Same size as main bubble */}
            <div
              className={cn(
                'px-4 pt-2 pb-4 rounded-2xl text-[13px] border border-transparent w-full transition-colors',
                isMe
                  ? 'bg-primary/60 text-primary-foreground border-primary-foreground/10'
                  : 'bg-secondary/40 text-muted-foreground border-border/40',
                isMe ? 'rounded-br-sm' : 'rounded-bl-sm',
              )}
            >
              <p className="line-clamp-2 italic">
                {message.parent.content || (message.parent.imageUrl ? 'Image' : 'Message deleted')}
              </p>
            </div>
          </div>
        )}

        {/* Main Message Bubble - Overlapping on top */}
        <div
          className={cn(
            'px-4 py-2 text-[13px] rounded-2xl shadow-sm transition-all hover:shadow-md relative z-10 w-full',
            message.parent && '-mt-3',
            isMe
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm',
            message.parent && (isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'),
          )}
        >
          {!isMe && showAvatar && (
            <span className="text-[10px] font-semibold block mb-1 opacity-70">
              {message.user?.name}
            </span>
          )}
          <p className="whitespace-pre-wrap break-words">
            {renderWithLinks(
              message.content ?? '',
              isMe ? 'text-primary-foreground/90' : 'text-primary',
            )}
          </p>

          {/* Metadata: timestamp + edited */}
          <div
            className={cn(
              'text-[9px] mt-1 opacity-60 flex gap-1',
              isMe ? 'justify-end' : 'justify-start',
            )}
          >
            {isMe && isEdited && <span className="italic font-light opacity-80">(edited)</span>}
            <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
            {!isMe && isEdited && <span className="italic font-light opacity-80">(edited)</span>}
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-accent"
          onClick={() => onReply?.(message)}
        >
          <Reply className="h-3 w-3" />
        </Button>
        {isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-accent">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit?.(message)} className="text-xs">
                <Pencil className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(message.id)}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

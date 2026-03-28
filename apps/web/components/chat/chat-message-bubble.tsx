import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

function renderWithLinks(text: string, isMe: boolean) {
  const parts = text.split(URL_REGEX)
  const urls = text.match(URL_REGEX) ?? []
  return parts.flatMap((part, i) => [
    part,
    urls[i] ? (
      <a
        key={i}
        href={urls[i]}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline underline-offset-2 break-all hover:opacity-80',
          isMe ? 'text-primary-foreground/90' : 'text-primary',
        )}
      >
        {urls[i]}
      </a>
    ) : null,
  ])
}

interface ChatMessageBubbleProps {
  message: ChatMessageEntity
  isMe: boolean
  showAvatar: boolean
  currentUserId?: string
}

export function ChatMessageBubble({ message, isMe, showAvatar }: ChatMessageBubbleProps) {
  return (
    <div className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
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

      <div
        className={cn(
          'max-w-[70%] px-3 py-2 rounded-2xl text-[13px] shadow-sm transition-all',
          isMe
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {!isMe && showAvatar && (
          <span className="text-[10px] font-semibold block mb-1 opacity-70">
            {message.user?.name}
          </span>
        )}
        <p className="whitespace-pre-wrap break-words">
          {renderWithLinks(message.content ?? '', isMe)}
        </p>
        <span className={cn('text-[9px] block mt-1 opacity-60', isMe ? 'text-right' : 'text-left')}>
          {format(new Date(message.createdAt), 'HH:mm')}
        </span>
      </div>
    </div>
  )
}

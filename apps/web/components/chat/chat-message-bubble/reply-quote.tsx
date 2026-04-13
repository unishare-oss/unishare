import { ImageIcon, FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ReplyQuoteProps {
  parent: NonNullable<ChatMessageEntity['parent']>
  isMe: boolean
  parentName: string | undefined
  onScrollToMessage?: (messageId: string) => void
}

export function ReplyQuote({ parent, isMe, parentName, onScrollToMessage }: ReplyQuoteProps) {
  const parentText = parent.content || (parent.imageUrl ? null : 'Message deleted')

  return (
    <div
      className={cn(
        'flex gap-2.5 px-3 pt-2.5 pb-2 border-b transition-opacity',
        isMe
          ? 'bg-primary-foreground/10 border-primary-foreground/15'
          : 'bg-accent/70 border-accent-foreground/15',
        onScrollToMessage && parent.id ? 'cursor-pointer hover:opacity-80 active:opacity-60' : '',
      )}
      onClick={() => parent.id && onScrollToMessage?.(parent.id)}
    >
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

        {parent.imageUrl && !parent.content ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[0.6875rem] italic',
              isMe ? 'text-primary-foreground/50' : 'text-foreground/60',
            )}
          >
            <ImageIcon className="size-3 shrink-0" />
            Photo
          </span>
        ) : parent.fileUrl && !parent.content ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[0.6875rem] italic',
              isMe ? 'text-primary-foreground/50' : 'text-foreground/60',
            )}
          >
            <FileIcon className="size-3 shrink-0" />
            {parent.fileName ?? 'File'}
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
  )
}

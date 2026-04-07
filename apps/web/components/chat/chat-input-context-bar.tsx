import { Button } from '@/components/ui/button'
import { X, Pencil, Reply } from 'lucide-react'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ChatInputContextBarProps {
  mode: 'edit' | 'reply'
  message: ChatMessageEntity
  onCancel: () => void
  currentUserId?: string
}

export function ChatInputContextBar({
  mode,
  message,
  onCancel,
  currentUserId,
}: ChatInputContextBarProps) {
  const isEdit = mode === 'edit'
  const Icon = isEdit ? Pencil : Reply

  const isReplyingToMe = mode === 'reply' && message.userId === currentUserId
  const replyTargetName = isReplyingToMe ? 'you' : message.user?.name

  const label = isEdit
    ? message.imageUrl
      ? 'Editing Caption'
      : 'Editing Message'
    : `Replying to ${replyTargetName}`

  return (
    <div className="w-full border-t border-border/50 bg-muted/20 animate-in slide-in-from-bottom-1 duration-200">
      <div className="max-w-4xl mx-auto flex items-stretch">
        {/* Amber accent strip */}
        <div className="w-[3px] bg-primary shrink-0 my-1 rounded-r-full" />

        <div className="flex-1 px-4 py-2 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-3 w-3 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.5625rem] font-bold font-mono tracking-widest uppercase text-primary leading-none mb-0.5">
                {label}
              </p>
              <p className="text-[0.6875rem] text-muted-foreground truncate italic opacity-80 leading-snug">
                {message.imageUrl && !message.content
                  ? isEdit
                    ? 'Add a caption…'
                    : '📷 Photo'
                  : message.content || (isEdit ? '' : '📷 Photo')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-muted shrink-0"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

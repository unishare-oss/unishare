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

  const label = isEdit ? 'Editing Message' : `Replying to ${replyTargetName}`

  return (
    <div className="bg-muted/10 w-full border-t animate-in slide-in-from-bottom-1 duration-200">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden mr-4">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">
              {label}
            </span>
            <span className="text-xs text-muted-foreground truncate opacity-70">
              &ldquo;{message.content}&rdquo;
            </span>
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
  )
}

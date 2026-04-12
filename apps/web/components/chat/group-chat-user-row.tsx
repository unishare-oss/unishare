import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatUser {
  id: string
  name?: string | null
  image?: string | null
}

interface UserRowProps {
  user: ChatUser
  selected: boolean
  onToggle: (id: string) => void
}

export function UserRow({ user, selected, onToggle }: UserRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(user.id)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left w-full',
        selected && 'bg-primary/5',
      )}
    >
      <Avatar className="h-8 w-8 rounded-[5px] shrink-0">
        <AvatarImage src={user.image || ''} />
        <AvatarFallback className="rounded-none text-xs font-mono bg-border text-foreground font-medium">
          {user.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 text-sm font-medium truncate">{user.name}</span>
      <div
        className={cn(
          'size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          selected ? 'bg-primary border-primary' : 'border-muted-foreground/30',
        )}
      >
        {selected && <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />}
      </div>
    </button>
  )
}

interface SelectedBadgeProps {
  user: ChatUser
  onRemove: (id: string) => void
}

export function SelectedBadge({ user, onRemove }: SelectedBadgeProps) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1 py-0.5 text-xs font-normal">
      <Avatar className="h-4 w-4 rounded-[3px]">
        <AvatarImage src={user.image || ''} />
        <AvatarFallback className="rounded-none text-[8px] font-mono bg-border">
          {user.name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[80px] truncate">{user.name}</span>
      <button
        type="button"
        onClick={() => onRemove(user.id)}
        className="ml-0.5 rounded-sm hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
        aria-label={`Remove ${user.name}`}
      >
        <X className="size-2.5" />
      </button>
    </Badge>
  )
}

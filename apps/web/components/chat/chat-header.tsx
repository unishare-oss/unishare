'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PresenceEntry } from '@/contexts/chat-socket-context'

interface ChatHeaderProps {
  user?: {
    name: string
    image?: string | null
  }
  presence?: PresenceEntry
}

export function ChatHeader({ user, presence }: ChatHeaderProps) {
  const isOnline = presence?.status === 1

  const getStatus = () => {
    if (isOnline) return 'Active'
    if (presence?.lastSeen) {
      return `Last seen ${formatDistanceToNow(presence.lastSeen, { addSuffix: true })}`
    }
    return 'Offline'
  }

  return (
    <div className="flex items-center p-3.5 bg-background">
      <div className="flex items-center gap-3">
        <Avatar className={cn('h-8 w-8 rounded-[6px]', isOnline && 'ring-2 ring-green-500')}>
          <AvatarImage src={user?.image || ''} />
          <AvatarFallback className="rounded-none bg-border text-foreground font-mono font-medium">
            <UserIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight">{user?.name || 'Chat'}</span>
          <span
            className={cn(
              'text-[0.625rem] uppercase tracking-widest',
              isOnline ? 'text-green-500' : 'text-muted-foreground',
            )}
          >
            {getStatus()}
          </span>
        </div>
      </div>
    </div>
  )
}

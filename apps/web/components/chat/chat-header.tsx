'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatHeaderProps {
  user?: {
    name: string
    image?: string | null
    lastSeenAt?: string | Date
    isActive?: boolean
  }
}

export function ChatHeader({ user }: ChatHeaderProps) {
  const getStatus = () => {
    if (user?.isActive) return 'Active'
    if (user?.lastSeenAt) {
      try {
        return `Last seen ${formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })}`
      } catch {
        return 'Offline'
      }
    }
    return 'Offline'
  }

  return (
    <div className="flex items-center p-3.5 bg-background">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 rounded-[6px]">
          <AvatarImage src={user?.image || ''} />
          <AvatarFallback className="rounded-none bg-border text-foreground font-mono font-medium">
            <UserIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight">{user?.name || 'Chat'}</span>
          <span className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
            {getStatus()}
          </span>
        </div>
      </div>
    </div>
  )
}

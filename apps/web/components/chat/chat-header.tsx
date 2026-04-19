'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User as UserIcon, Users, LockKeyhole } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PresenceEntry } from '@/contexts/chat-socket-context'
import type { ChatRoomParticipantEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface DMHeaderProps {
  mode: 'dm'
  user?: {
    name: string
    image?: string | null
  }
  presence?: PresenceEntry
}

interface GroupHeaderProps {
  mode: 'group'
  groupName?: string | null
  groupImage?: string | null
  participants?: ChatRoomParticipantEntity[]
  presenceMap?: Map<string, PresenceEntry>
}

type ChatHeaderProps = DMHeaderProps | GroupHeaderProps

export function ChatHeader(props: ChatHeaderProps) {
  if (props.mode === 'group') {
    return <GroupHeader {...props} />
  }
  return <DMHeader {...props} />
}

function DMHeader({ user, presence }: Omit<DMHeaderProps, 'mode'>) {
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
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight">{user?.name || 'Chat'}</span>
            <LockKeyhole className="size-3 text-muted-foreground" />
          </div>
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

function GroupHeader({
  groupName,
  groupImage,
  participants = [],
  presenceMap,
}: Omit<GroupHeaderProps, 'mode'>) {
  const total = participants.length
  const onlineCount = participants.filter((p) => presenceMap?.get(p.userId)?.status === 1).length
  const offlineCount = total - onlineCount

  return (
    <div className="flex items-center p-3.5 bg-background min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 rounded-[6px] shrink-0">
          <AvatarImage src={groupImage || ''} />
          <AvatarFallback className="rounded-none bg-border text-foreground font-mono font-medium text-xs">
            {groupName ? groupName.substring(0, 2).toUpperCase() : <Users className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm tracking-tight truncate">
              {groupName || 'Group Chat'}
            </span>
            <LockKeyhole className="size-3 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[0.625rem] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              {total} {total === 1 ? 'member' : 'members'}
            </span>
            {total > 0 && (
              <>
                <span className="text-muted-foreground/40 text-[0.625rem]">·</span>
                <span className="text-[0.625rem] uppercase tracking-widest text-green-500 whitespace-nowrap">
                  {onlineCount} online
                </span>
                {offlineCount > 0 && (
                  <>
                    <span className="text-muted-foreground/40 text-[0.625rem] hidden sm:inline">
                      ·
                    </span>
                    <span className="text-[0.625rem] uppercase tracking-widest text-muted-foreground whitespace-nowrap hidden sm:inline">
                      {offlineCount} offline
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

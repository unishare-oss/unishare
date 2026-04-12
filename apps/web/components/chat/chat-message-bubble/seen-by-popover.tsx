import Link from 'next/link'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ChatRoomParticipantEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface SeenByPopoverProps {
  seenBy: ChatRoomParticipantEntity[]
  isMe: boolean
}

export function SeenByPopover({ seenBy, isMe }: SeenByPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-accent hover:text-accent-foreground"
          title="Seen by"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" side="top" align={isMe ? 'end' : 'start'}>
        <p className="text-[0.625rem] font-bold font-mono tracking-widest uppercase text-muted-foreground px-1 mb-2">
          Seen by
        </p>
        {seenBy.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No one yet</p>
        ) : (
          <ul className="flex flex-col">
            {seenBy.map((p, idx) => (
              <li key={p.userId}>
                {idx > 0 && <div className="h-px bg-border mx-1 my-0.5" />}
                <Link
                  href={`/users/${p.userId}`}
                  className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-accent transition-colors"
                >
                  <Avatar className="h-6 w-6 rounded-[4px] shrink-0">
                    <AvatarImage src={p.user?.image || ''} />
                    <AvatarFallback className="text-[0.5rem] rounded-none bg-border text-foreground font-mono font-medium">
                      {p.user?.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-none">{p.user?.name}</p>
                    <p className="text-[0.625rem] text-muted-foreground mt-0.5">
                      {format(new Date(p.lastReadAt), 'HH:mm')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

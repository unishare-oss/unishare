import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const SKELETON_ROWS = [
  { isMe: false, w: 'w-48' },
  { isMe: true, w: 'w-36' },
  { isMe: false, w: 'w-64' },
  { isMe: false, w: 'w-40' },
  { isMe: true, w: 'w-52' },
  { isMe: true, w: 'w-32' },
  { isMe: false, w: 'w-56' },
]

export function ChatMessagesSkeleton() {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="flex flex-col gap-4 max-w-6xl mx-auto">
        {SKELETON_ROWS.map((item, i) => (
          <div
            key={i}
            className={cn('flex items-end gap-2', item.isMe ? 'flex-row-reverse' : 'flex-row')}
          >
            {!item.isMe && <Skeleton className="h-8 w-8 rounded-[6px] shrink-0 bg-muted" />}
            <Skeleton
              className={cn(
                'h-9 rounded-2xl bg-muted',
                item.w,
                item.isMe ? 'rounded-br-sm' : 'rounded-bl-sm',
              )}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

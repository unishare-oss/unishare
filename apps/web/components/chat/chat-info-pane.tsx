'use client'

import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Bell, BellOff, LogOut, Trash2, Link2, Users, ImageIcon, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatRoomEntity, ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

interface ChatInfoPaneProps {
  room?: ChatRoomEntity
  messages: ChatMessageEntity[]
  currentUserId?: string
}

export function ChatInfoPane({ room, messages, currentUserId }: ChatInfoPaneProps) {
  const otherParticipant =
    room?.type === 'DM' ? room.participants?.find((p) => p.userId !== currentUserId) : null

  const displayName = otherParticipant?.user?.name ?? (room?.name as string) ?? 'Chat Room'
  const displayImage = otherParticipant?.user?.image ?? (room?.imageUrl as string) ?? ''

  const sharedPhotos = useMemo(
    () => messages.filter((m) => m.type === 'IMAGE' && m.imageUrl),
    [messages],
  )

  const sharedLinks = useMemo(() => {
    const explicit = messages
      .filter((m) => m.type === 'LINK' && m.linkUrl)
      .map((m) => m.linkUrl as string)
    const inText = messages
      .filter((m) => m.type === 'TEXT' && m.content)
      .flatMap((m) => (m.content as string).match(URL_REGEX) ?? [])
    return [...new Set([...explicit, ...inText])]
  }, [messages])

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col w-64">
        {/* About */}
        <div className="flex flex-col items-center gap-2 px-4 py-6 border-b">
          <Avatar className="h-14 w-14 rounded-xl">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="rounded-xl bg-border text-foreground font-mono font-semibold text-lg">
              {displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-semibold text-sm">{displayName}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
              {room?.type === 'DM'
                ? 'Direct Message'
                : `Group · ${room?.participants?.length ?? 0} members`}
            </p>
            {room?.createdAt && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Created {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users className="size-3" />
            Members · {room?.participants?.length ?? 0}
          </h3>
          <div className="flex flex-col gap-2">
            {room?.participants?.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7 rounded-[4px] shrink-0">
                  <AvatarImage src={p.user?.image || ''} />
                  <AvatarFallback className="text-[9px] rounded-none bg-border text-foreground font-mono font-medium">
                    {p.user?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.user?.name}</p>
                </div>
                {p.userId === currentUserId && (
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shared Photos */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <ImageIcon className="size-3" />
            Photos · {sharedPhotos.length}
          </h3>
          {sharedPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {sharedPhotos.slice(0, 9).map((msg) => (
                <a
                  key={msg.id}
                  href={msg.imageUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-[4px] overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.imageUrl as string} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No photos yet</p>
          )}
        </div>

        {/* Shared Links */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Link2 className="size-3" />
            Links · {sharedLinks.length}
          </h3>
          {sharedLinks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sharedLinks.slice(0, 5).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary truncate hover:underline"
                >
                  {url}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No links yet</p>
          )}
        </div>

        {/* Settings — placeholders */}
        <div className="px-4 py-4 flex flex-col gap-1">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Info className="size-3" />
            Settings
          </h3>

          <button
            disabled
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-[6px] text-sm text-left w-full',
              'text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            <Bell className="size-4 shrink-0" strokeWidth={1.5} />
            <span>Mute notifications</span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>

          <button
            disabled
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-[6px] text-sm text-left w-full',
              'text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            <BellOff className="size-4 shrink-0" strokeWidth={1.5} />
            <span>Block user</span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>

          <button
            disabled
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-[6px] text-sm text-left w-full',
              'text-red-400/50 cursor-not-allowed',
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.5} />
            <span>Leave conversation</span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>

          <button
            disabled
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-[6px] text-sm text-left w-full',
              'text-red-400/50 cursor-not-allowed',
            )}
          >
            <Trash2 className="size-4 shrink-0" strokeWidth={1.5} />
            <span>Delete conversation</span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Soon
            </span>
          </button>
        </div>
      </div>
    </ScrollArea>
  )
}

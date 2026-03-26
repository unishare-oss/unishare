'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Bell,
  BellOff,
  LogOut,
  Trash2,
  Link2,
  Users,
  ImageIcon,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Search,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatRoomEntity, ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface ChatInfoPaneProps {
  room?: ChatRoomEntity
  messages: ChatMessageEntity[]
  currentUserId?: string
  isOpen: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function ChatInfoPane({
  room,
  messages,
  currentUserId,
  isOpen,
  searchQuery,
  onSearchChange,
}: ChatInfoPaneProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [showAllLinks, setShowAllLinks] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

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

  const visiblePhotos = showAllPhotos ? sharedPhotos : sharedPhotos.slice(0, 9)
  const visibleLinks = showAllLinks ? sharedLinks : sharedLinks.slice(0, 5)
  const isLoading = !room

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <button className="absolute top-4 right-4 p-2" onClick={() => setLightboxSrc(null)}>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="size-5" />
            </Button>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div
        className={cn(
          'h-full transition-opacity duration-200',
          isOpen ? 'opacity-100 delay-150' : 'opacity-0',
        )}
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col w-64">
            {/* Search */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search messages…"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8 pr-7 h-8 text-xs"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => onSearchChange('')}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* About */}
            <div className="flex flex-col items-center gap-2 px-4 py-6 border-b">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-3 w-24 rounded-[4px] mt-1" />
                  <Skeleton className="h-2.5 w-16 rounded-[4px]" />
                </>
              ) : (
                <>
                  <Avatar className="h-14 w-14 rounded-xl">
                    <AvatarImage src={displayImage} />
                    <AvatarFallback className="rounded-xl bg-border text-foreground font-mono font-semibold text-lg">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{displayName}</p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                      {room.type === 'DM'
                        ? 'Direct Message'
                        : `Group · ${room.participants?.length ?? 0} members`}
                    </p>
                    {room.createdAt && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Created {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Members */}
            <div className="px-4 py-4 border-b">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="size-3" />
                Members · {room?.participants?.length ?? 0}
              </h3>
              <div className="flex flex-col gap-2">
                {isLoading
                  ? [1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Skeleton className="h-7 w-7 rounded-[4px] shrink-0" />
                        <Skeleton className="h-2.5 w-20 rounded-[4px]" />
                      </div>
                    ))
                  : room.participants?.map((p) => (
                      <Link
                        key={p.id}
                        href={`/users/${p.userId}`}
                        className="flex items-center gap-2.5 rounded-[6px] hover:bg-muted px-1 py-0.5 transition-colors group"
                      >
                        <Avatar className="h-7 w-7 rounded-[4px] shrink-0">
                          <AvatarImage src={p.user?.image || ''} />
                          <AvatarFallback className="text-[9px] rounded-none bg-border text-foreground font-mono font-medium">
                            {p.user?.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">
                          {p.user?.name}
                        </p>
                        {p.userId === currentUserId && (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                            You
                          </span>
                        )}
                      </Link>
                    ))}
              </div>
            </div>

            {/* Shared Photos */}
            <div className="px-4 py-4 border-b">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <ImageIcon className="size-3" />
                Photos · {sharedPhotos.length}
              </h3>
              {isLoading ? (
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-[4px]" />
                  ))}
                </div>
              ) : sharedPhotos.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-1">
                    {visiblePhotos.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => setLightboxSrc(msg.imageUrl as string)}
                        className="aspect-square rounded-[4px] overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.imageUrl as string}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  {sharedPhotos.length > 9 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mt-1 h-auto px-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      onClick={() => setShowAllPhotos((v) => !v)}
                    >
                      {showAllPhotos ? (
                        <>
                          <ChevronUp className="size-3" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" /> View all {sharedPhotos.length}
                        </>
                      )}
                    </Button>
                  )}
                </>
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
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-4 w-full rounded-[4px]" />
                  ))}
                </div>
              ) : sharedLinks.length > 0 ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    {visibleLinks.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={url}
                        className="text-xs text-primary truncate hover:underline"
                      >
                        {getHostname(url)}
                      </a>
                    ))}
                  </div>
                  {sharedLinks.length > 5 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mt-1 h-auto px-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      onClick={() => setShowAllLinks((v) => !v)}
                    >
                      {showAllLinks ? (
                        <>
                          <ChevronUp className="size-3" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" /> View all {sharedLinks.length}
                        </>
                      )}
                    </Button>
                  )}
                </>
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
              {[
                { icon: Bell, label: 'Mute notifications' },
                { icon: BellOff, label: 'Block user' },
              ].map(({ icon: Icon, label }) => (
                <Button
                  key={label}
                  variant="ghost"
                  disabled
                  className="justify-start gap-3 w-full text-muted-foreground/50 cursor-not-allowed"
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>{label}</span>
                  <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </Button>
              ))}
              {[
                { icon: LogOut, label: 'Leave conversation' },
                { icon: Trash2, label: 'Delete conversation' },
              ].map(({ icon: Icon, label }) => (
                <Button
                  key={label}
                  variant="ghost"
                  disabled
                  className="justify-start gap-3 w-full text-red-400/50 cursor-not-allowed"
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>{label}</span>
                  <span className="ml-auto text-[9px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

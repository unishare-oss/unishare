'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Bell, BellOff, LogOut, Trash2, X } from 'lucide-react'
import type { ChatRoomEntity, ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { OverviewPane } from './overview-pane'
import { DetailPane } from './detail-pane'
import { URL_REGEX, slideVariants, getHostname, type PaneView } from './types'

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
  const [view, setView] = useState<PaneView>('overview')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const navigate = (to: PaneView) => {
    setDirection('forward')
    setView(to)
  }

  const goBack = () => {
    setDirection('back')
    setView('overview')
  }

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

  const isLoading = !room

  return (
    <>
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="size-5" />
          </Button>
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
          'h-full transition-opacity duration-200 overflow-hidden',
          isOpen ? 'opacity-100 delay-150' : 'opacity-0',
        )}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={view}
            custom={direction}
            variants={slideVariants}
            initial={direction === 'forward' ? 'enterForward' : 'enterBack'}
            animate="center"
            exit={direction === 'forward' ? 'exitForward' : 'exitBack'}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full w-full absolute"
          >
            {view === 'overview' && (
              <OverviewPane
                room={room}
                displayName={displayName}
                displayImage={displayImage}
                isLoading={isLoading}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                membersCount={room?.participants?.length ?? 0}
                photosCount={sharedPhotos.length}
                linksCount={sharedLinks.length}
                photosPreviews={sharedPhotos.slice(0, 3).map((m) => m.imageUrl as string)}
                onNavigate={navigate}
              />
            )}

            {view === 'members' && (
              <DetailPane title="Members" onBack={goBack}>
                <div className="flex flex-col gap-1 px-4 py-3">
                  {isLoading
                    ? [1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <Skeleton className="h-8 w-8 rounded-[4px] shrink-0" />
                          <Skeleton className="h-3 w-28 rounded-[4px]" />
                        </div>
                      ))
                    : room.participants?.map((p) => (
                        <Link
                          key={p.id}
                          href={`/users/${p.userId}`}
                          className="flex items-center gap-2.5 rounded-[6px] hover:bg-muted px-2 py-1.5 transition-colors group"
                        >
                          <Avatar className="h-8 w-8 rounded-[4px] shrink-0">
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
              </DetailPane>
            )}

            {view === 'photos' && (
              <DetailPane title="Photos" onBack={goBack}>
                <div className="px-4 py-3">
                  {sharedPhotos.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No photos yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {sharedPhotos.map((msg) => (
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
                  )}
                </div>
              </DetailPane>
            )}

            {view === 'links' && (
              <DetailPane title="Links" onBack={goBack}>
                <div className="flex flex-col gap-1 px-4 py-3">
                  {sharedLinks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No links yet</p>
                  ) : (
                    sharedLinks.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={url}
                        className="flex flex-col gap-0.5 rounded-[6px] hover:bg-muted px-2 py-2 transition-colors group"
                      >
                        <span className="text-xs font-medium text-primary truncate group-hover:underline">
                          {getHostname(url)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{url}</span>
                      </a>
                    ))
                  )}
                </div>
              </DetailPane>
            )}

            {view === 'settings' && (
              <DetailPane title="Settings" onBack={goBack}>
                <div className="flex flex-col gap-1 px-3 py-3">
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
                  <div className="my-1 border-t" />
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
              </DetailPane>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

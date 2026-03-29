'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, ImageIcon, Link2, Info, X, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatRoomEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { SectionRow } from './section-row'
import type { PaneView } from './types'

interface OverviewPaneProps {
  room?: ChatRoomEntity
  displayName: string
  displayImage: string
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  membersCount: number
  photosCount: number
  linksCount: number
  photosPreviews: string[]
  onNavigate: (view: PaneView) => void
}

export function OverviewPane({
  room,
  displayName,
  displayImage,
  isLoading,
  searchQuery,
  onSearchChange,
  membersCount,
  photosCount,
  linksCount,
  photosPreviews,
  onNavigate,
}: OverviewPaneProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
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
                <Skeleton className="h-14 w-14 rounded-xl" />
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
                    {room!.type === 'DM'
                      ? 'Direct Message'
                      : `Group · ${room!.participants?.length ?? 0} members`}
                  </p>
                  {room!.createdAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Created {formatDistanceToNow(new Date(room!.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Section rows */}
          <div className="flex flex-col divide-y">
            <SectionRow
              icon={Users}
              label="Members"
              count={membersCount}
              onClick={() => onNavigate('members')}
            />
            <SectionRow
              icon={ImageIcon}
              label="Photos"
              count={photosCount}
              preview={
                photosPreviews.length > 0 ? (
                  <div className="flex gap-1">
                    {photosPreviews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-8 w-8 rounded-[3px] object-cover opacity-80"
                      />
                    ))}
                  </div>
                ) : null
              }
              onClick={() => onNavigate('photos')}
            />
            <SectionRow
              icon={Link2}
              label="Links"
              count={linksCount}
              onClick={() => onNavigate('links')}
            />
            <SectionRow icon={Info} label="Settings" onClick={() => onNavigate('settings')} />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

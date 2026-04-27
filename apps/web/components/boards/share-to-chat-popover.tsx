'use client'

import { useState, useMemo } from 'react'
import { Send, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useChatControllerGetRooms } from '@/src/lib/api/generated/chat/chat'
import { useChatMessageActions } from '@/hooks/use-chat-message-actions'
import { useCrypto } from '@/hooks/use-crypto'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface ShareToChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: {
    slug: string
    title: string | null
  }
}

export function ShareToChatDialog({ open, onOpenChange, room }: ShareToChatDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  const { session, user } = useAuth()
  const currentUserId = session?.user?.id

  const { data: roomsResponse } = useChatControllerGetRooms()
  const rooms = useMemo(() => roomsResponse?.data ?? [], [roomsResponse])

  const { encrypt, hasRoomKey } = useCrypto()
  const { sendMessage } = useChatMessageActions({ roomId: undefined, user })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter((r) => {
      if (r.type === 'DM') {
        const other = r.participants?.find((p) => p.userId !== currentUserId)
        return other?.user?.name?.toLowerCase().includes(q)
      }
      return r.name?.toLowerCase().includes(q)
    })
  }, [rooms, search, currentUserId])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (selected.size === 0) return
    setSending(true)
    const linkUrl = window.location.origin + '/canvas/' + room.slug
    try {
      for (const roomId of selected) {
        const chatRoom = rooms.find((r) => r.id === roomId)
        const isEncrypted = !!chatRoom?.participants?.find((p) => p.userId === currentUserId)
          ?.encryptedRoomKey

        let content = linkUrl
        if (isEncrypted) {
          if (!hasRoomKey(roomId)) {
            toast.error('Encryption key not ready — please try again in a moment')
            setSending(false)
            return
          }
          content = await encrypt(roomId, linkUrl)
        }

        sendMessage({
          id: roomId,
          data: { type: 'LINK', content },
        })
      }
      toast.success(`Shared to ${selected.size} conversation${selected.size > 1 ? 's' : ''}`)
      onOpenChange(false)
      setSelected(new Set())
      setSearch('')
    } catch {
      toast.error('Failed to share board')
    } finally {
      setSending(false)
    }
  }

  const getRoomDisplay = (r: any) => {
    if (r.type === 'DM') {
      const other = r.participants?.find((p: any) => p.userId !== currentUserId)
      return {
        name: other?.user?.name ?? 'Direct Message',
        image: other?.user?.image ?? '',
        initials: (other?.user?.name ?? 'DM').substring(0, 2).toUpperCase(),
      }
    }
    return {
      name: r.name ?? 'Group Chat',
      image: r.imageUrl ?? '',
      initials: (r.name ?? 'GC').substring(0, 2).toUpperCase(),
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 rounded-[6px] border-border bg-card sm:max-w-md">
        <DialogHeader className="px-4 py-3 border-b border-border space-y-1">
          <DialogTitle className="text-sm font-semibold text-foreground">Share to Chat</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{room.title ?? 'Untitled board'}</p>
        </DialogHeader>

        {/* Search */}
        <div className="px-3 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Find a conversation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm rounded-[6px] bg-muted border-transparent focus-visible:border-primary"
            />
          </div>
        </div>

        {/* Chat list */}
        <ScrollArea className="max-h-[300px]">
          <div className="py-1">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">
                No conversations found
              </p>
            )}
            {filtered.map((r) => {
              const { name, image, initials } = getRoomDisplay(r)
              const isChecked = selected.has(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={cn(
                    'relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                    isChecked &&
                      'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-r',
                  )}
                >
                  <Avatar className="h-9 w-9 rounded-[6px] shrink-0">
                    <AvatarImage src={image} alt={name} />
                    <AvatarFallback className="text-xs rounded-[6px] bg-border text-foreground font-mono font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate text-foreground">
                    {name}
                  </span>
                  <div
                    className={cn(
                      'size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      isChecked ? 'bg-primary border-primary' : 'bg-background border-border',
                    )}
                  >
                    {isChecked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border">
          <Button
            className="w-full rounded-[6px]"
            disabled={selected.size === 0 || sending}
            onClick={handleSend}
          >
            <Send className="size-4 mr-2" strokeWidth={1.5} />
            {selected.size > 0
              ? `Send to ${selected.size} conversation${selected.size > 1 ? 's' : ''}`
              : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

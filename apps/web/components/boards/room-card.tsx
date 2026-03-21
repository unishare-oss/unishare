'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  MoreVertical,
  ExternalLink,
  Link2,
  Pencil,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Trash2,
  Check,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

interface RoomCardProps {
  room: {
    id: string
    slug: string
    title: string | null
    visibility: string
    createdAt: string
    updatedAt: string
    hasPassword: boolean
  }
  onDelete: (slug: string) => void
  onRename: (slug: string, title: string) => void
  onVisibilityChange: (slug: string, visibility: string) => void
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility === 'OPEN') {
    return (
      <span className="self-start inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-subtle text-amber">
        Open
      </span>
    )
  }
  if (visibility === 'VIEW_ONLY') {
    return (
      <span className="self-start inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        View only
      </span>
    )
  }
  return (
    <span className="self-start inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
      Private
    </span>
  )
}

export function RoomCard({ room, onDelete, onRename, onVisibilityChange }: RoomCardProps) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renamePending, setRenamePending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  const handleCardClick = () => {
    router.push(`/canvas/${room.slug}`)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/canvas/' + room.slug)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleRenameOpen = () => {
    setRenameValue(room.title ?? '')
    setRenameOpen(true)
  }

  const handleRenameSave = async () => {
    const prevTitle = room.title
    setRenamePending(true)
    onRename(room.slug, renameValue)
    try {
      const res = await fetch(`/api/rooms/${room.slug}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue }),
      })
      if (!res.ok) {
        onRename(room.slug, prevTitle ?? '')
        toast.error('Failed to rename board')
      } else {
        setRenameOpen(false)
      }
    } catch {
      onRename(room.slug, prevTitle ?? '')
      toast.error('Failed to rename board')
    } finally {
      setRenamePending(false)
    }
  }

  const handleVisibilityChange = async (newVisibility: string) => {
    const prevVisibility = room.visibility
    onVisibilityChange(room.slug, newVisibility)
    try {
      const res = await fetch(`/api/rooms/${room.slug}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (!res.ok) {
        onVisibilityChange(room.slug, prevVisibility)
        toast.error('Failed to update visibility')
      }
    } catch {
      onVisibilityChange(room.slug, prevVisibility)
      toast.error('Failed to update visibility')
    }
  }

  const handleDelete = async () => {
    setDeletePending(true)
    try {
      const res = await fetch(`/api/rooms/${room.slug}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        toast.error('Failed to delete board')
      } else {
        setDeleteOpen(false)
        onDelete(room.slug)
      }
    } catch {
      toast.error('Failed to delete board')
    } finally {
      setDeletePending(false)
    }
  }

  const createdAgo = formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })
  const updatedAgo = formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })

  return (
    <>
      <article
        className="group relative rounded-[6px] border border-border bg-card hover:bg-card-dark flex flex-col cursor-pointer transition-colors overflow-hidden"
        onClick={handleCardClick}
      >
        {/* Canvas preview header */}
        <div className="h-24 bg-[var(--muted)] relative overflow-hidden flex-shrink-0">
          <svg
            aria-hidden="true"
            width="100%"
            height="100%"
            className="absolute inset-0 opacity-40"
          >
            <defs>
              <pattern
                id={`grid-${room.slug}`}
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${room.slug})`} />
          </svg>
          {room.visibility === 'OPEN' && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              aria-hidden="true"
              width="52"
              height="40"
              viewBox="0 0 52 40"
              fill="none"
              className="opacity-20"
            >
              <rect
                x="1"
                y="1"
                width="50"
                height="30"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="8"
                y1="10"
                x2="22"
                y2="10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="8"
                y1="15"
                x2="18"
                y2="15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="8"
                y1="20"
                x2="25"
                y2="20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M32 22 L38 14 L44 18 L38 26Z" stroke="currentColor" strokeWidth="1.2" />
              <line
                x1="18"
                y1="31"
                x2="15"
                y2="39"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="34"
                y1="31"
                x2="37"
                y2="39"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="13"
                y1="39"
                x2="39"
                y2="39"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {/* Kebab — top-right of preview area */}
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 bg-card/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-card"
                  aria-label="Board options"
                >
                  <MoreVertical className="size-3.5" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/canvas/${room.slug}`)}>
                  <ExternalLink className="size-4 mr-2" strokeWidth={1.5} />
                  Open board
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="size-4 mr-2" strokeWidth={1.5} />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRenameOpen}>
                  <Pencil className="size-4 mr-2" strokeWidth={1.5} />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1">
                  Visibility
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleVisibilityChange('OPEN')}>
                  <Eye className="size-4 mr-2" strokeWidth={1.5} />
                  Open
                  {room.visibility === 'OPEN' && (
                    <Check className="size-3.5 ml-auto text-muted-foreground" strokeWidth={2} />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVisibilityChange('VIEW_ONLY')}>
                  <EyeOff className="size-4 mr-2" strokeWidth={1.5} />
                  View only
                  {room.visibility === 'VIEW_ONLY' && (
                    <Check className="size-3.5 ml-auto text-muted-foreground" strokeWidth={2} />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVisibilityChange('PRIVATE')}>
                  <Lock className="size-4 mr-2" strokeWidth={1.5} />
                  Private
                  {room.visibility === 'PRIVATE' && (
                    <Check className="size-3.5 ml-auto text-muted-foreground" strokeWidth={2} />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4 mr-2" strokeWidth={1.5} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 flex flex-col gap-2.5">
          <span
            className={`text-sm font-semibold leading-snug ${room.title ? 'text-foreground' : 'text-text-muted'}`}
          >
            {room.title ?? 'Untitled'}
          </span>
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={room.visibility} />
            {room.hasPassword && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                <KeyRound className="h-3 w-3" aria-hidden="true" />
                Protected
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Created {createdAgo}</span>
            <span>·</span>
            <span>Updated {updatedAgo}</span>
          </div>
        </div>
      </article>

      {/* Rename dialog — separate from dropdown to avoid Radix focus conflict */}
      <Dialog
        open={renameOpen}
        onOpenChange={(next) => {
          if (!renamePending) setRenameOpen(next)
        }}
      >
        <DialogContent className="rounded-[6px] border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Rename board
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Untitled board"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              disabled={renamePending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSave()
              }}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={renamePending}>
                Cancel
              </Button>
              <Button onClick={handleRenameSave} disabled={renamePending} className="rounded-[6px]">
                Save name
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this board?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={deletePending}
      />
    </>
  )
}

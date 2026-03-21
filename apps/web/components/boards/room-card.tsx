'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { MoreVertical, ExternalLink, Link2, Pencil, Eye, EyeOff, Lock, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  }
  onDelete: (slug: string) => void
  onRename: (slug: string, title: string) => void
  onVisibilityChange: (slug: string, visibility: string) => void
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility === 'OPEN') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-subtle text-amber">
        Open
      </span>
    )
  }
  if (visibility === 'VIEW_ONLY') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        View only
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
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
        className="group relative rounded-[6px] border border-border bg-card hover:bg-card-dark p-4 flex flex-col gap-3 cursor-pointer transition-colors"
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${room.title ? 'text-foreground' : 'text-text-muted'}`}
          >
            {room.title ?? 'Untitled'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Board options"
              >
                <MoreVertical className="size-4" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
              <DropdownMenuItem asChild>
                <div className="flex flex-col gap-1 cursor-default focus:bg-accent">
                  <span className="text-sm flex items-center gap-2 px-0 py-0">
                    Change visibility
                  </span>
                  <div className="flex flex-col gap-0.5 pl-0">
                    <button
                      className={`flex items-center gap-2 w-full text-xs px-2 py-1 rounded hover:bg-muted transition-colors ${room.visibility === 'OPEN' ? 'font-medium text-amber' : 'text-muted-foreground'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVisibilityChange('OPEN')
                      }}
                    >
                      <Eye className="size-3" strokeWidth={1.5} />
                      Open
                    </button>
                    <button
                      className={`flex items-center gap-2 w-full text-xs px-2 py-1 rounded hover:bg-muted transition-colors ${room.visibility === 'VIEW_ONLY' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVisibilityChange('VIEW_ONLY')
                      }}
                    >
                      <EyeOff className="size-3" strokeWidth={1.5} />
                      View only
                    </button>
                    <button
                      className={`flex items-center gap-2 w-full text-xs px-2 py-1 rounded hover:bg-muted transition-colors ${room.visibility === 'PRIVATE' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVisibilityChange('PRIVATE')
                      }}
                    >
                      <Lock className="size-3" strokeWidth={1.5} />
                      Private
                    </button>
                  </div>
                </div>
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

        <div>
          <VisibilityBadge visibility={room.visibility} />
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Created {createdAgo}</span>
          <span>Updated {updatedAgo}</span>
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

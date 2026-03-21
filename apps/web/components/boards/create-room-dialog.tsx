'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || undefined }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create board' }))
        toast.error(err.message || 'Failed to create board')
        return
      }

      const room = await res.json()
      onOpenChange(false)
      setTitle('')
      router.push(`/canvas/${room.data.slug}`)
    } catch {
      toast.error('Failed to create board')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="rounded-[6px] border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">New Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="board-title" className="text-sm text-muted-foreground">
              Title (optional)
            </label>
            <Input
              id="board-title"
              placeholder="Untitled board"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full rounded-[6px]">
              {isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Create board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound, LayoutGrid, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { generateRoomKey, exportRoomKeyRaw } from '@/src/lib/crypto'
import { useBoardKeysStore } from '@/lib/store'

type RoomVisibility = 'OPEN' | 'VIEW_ONLY' | 'PRIVATE'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<RoomVisibility>('OPEN')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)

    try {
      const body: Record<string, unknown> = { title: title.trim() || undefined, visibility }
      if (password.trim()) body.password = password.trim()

      const res = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create board' }))
        toast.error(err.message || 'Failed to create board')
        return
      }

      const room = await res.json()
      onOpenChange(false)
      setTitle('')
      setVisibility('OPEN')
      setPassword('')
      const exportedKey = await exportRoomKeyRaw(await generateRoomKey())
      useBoardKeysStore.getState().setKey(room.data.slug, exportedKey)
      router.push(`/canvas/${room.data.slug}#key=${exportedKey}`)
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
      <DialogContent className="rounded-[6px] border-border bg-card sm:max-w-sm p-0 overflow-hidden">
        {/* Header accent */}
        <div className="h-20 bg-muted relative overflow-hidden flex items-center justify-center">
          <svg
            aria-hidden="true"
            width="100%"
            height="100%"
            className="absolute inset-0 opacity-30"
          >
            <defs>
              <pattern id="create-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#create-grid)" />
          </svg>
          <div className="relative flex items-center justify-center size-10 rounded-[8px] bg-card border border-border shadow-sm">
            <LayoutGrid className="size-5 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-semibold text-foreground">New Board</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Name your canvas, or start blank and rename later.
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="board-title"
              placeholder="Untitled board"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isPending}
            />

            <Separator />

            {/* Visibility */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Visibility
              </Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as RoomVisibility)}
                className="flex flex-col gap-1.5"
                disabled={isPending}
              >
                {(
                  [
                    { value: 'OPEN', label: 'Open', desc: 'Everyone can edit' },
                    {
                      value: 'VIEW_ONLY',
                      label: 'View only',
                      desc: 'Guests can view, signed-in users edit',
                    },
                    {
                      value: 'PRIVATE',
                      label: 'Private',
                      desc: 'Only signed-in users can access',
                    },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2.5 cursor-pointer group"
                    htmlFor={`vis-${value}`}
                  >
                    <RadioGroupItem value={value} id={`vis-${value}`} />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-foreground leading-none">
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <KeyRound className="size-3" />
                Password protection
                <span className="normal-case font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Leave blank for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full rounded-[6px]">
                {isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                Create board
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

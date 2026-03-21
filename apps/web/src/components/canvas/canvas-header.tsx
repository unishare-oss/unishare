'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ClipboardCopy, Download, FileText, Settings, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCollab, useCollabPresence, type Participant } from '@/contexts/collab-context'
import { PRESENCE_COLORS } from '@/src/lib/presence'
import { exportPng, exportPdf, postToUniShare } from './export-utils'

/** Extract initials: "Alice Bob" → "AB", "SleepyOtter" → "SL", "A" → "A" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const MAX_VISIBLE_AVATARS = 3

function ParticipantAvatars() {
  const { participants, socketId } = useCollabPresence()

  if (participants.length === 0) return null

  const visible = participants.slice(0, MAX_VISIBLE_AVATARS)
  const overflow = participants.length - MAX_VISIBLE_AVATARS

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex cursor-pointer items-center" aria-label="Participants in this room">
          {visible.map((p: Participant, i: number) => (
            <div
              key={p.socketId}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium leading-none text-white ring-2 ring-background"
              style={{
                backgroundColor: PRESENCE_COLORS[p.colorIndex % PRESENCE_COLORS.length],
                marginLeft: i > 0 ? '-6px' : undefined,
              }}
              title={p.socketId === socketId ? `${p.name} (you)` : p.name}
            >
              {getInitials(p.name)}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium leading-none text-muted-foreground ring-2 ring-background"
              style={{ marginLeft: '-6px' }}
            >
              +{overflow}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        {participants.map((p: Participant) => (
          <DropdownMenuItem
            key={p.socketId}
            className="flex items-center gap-2 px-3 py-2"
            onSelect={(e) => e.preventDefault()}
          >
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: PRESENCE_COLORS[p.colorIndex % PRESENCE_COLORS.length],
              }}
            />
            <span className="flex-1 text-sm text-foreground">{p.name}</span>
            {p.socketId === socketId && (
              <span className="ml-1 text-xs text-muted-foreground">(you)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ExportDropdown() {
  const { slug } = useParams<{ slug: string }>()
  const { excalidrawAPI, isAnonymous } = useCollab()

  const handleExportPng = async () => {
    if (!excalidrawAPI) return
    try {
      await exportPng(excalidrawAPI, slug)
      toast.success('Board exported as PNG')
    } catch {
      toast.error('Export failed — try again')
    }
  }

  const handleExportPdf = async () => {
    if (!excalidrawAPI) return
    try {
      await exportPdf(excalidrawAPI, slug)
      toast.success('Board exported as PDF')
    } catch {
      toast.error('Export failed — try again')
    }
  }

  const handlePostToUniShare = async () => {
    if (!excalidrawAPI) return
    try {
      await postToUniShare(excalidrawAPI, slug)
      toast.success('Opening post editor...')
    } catch {
      toast.error('Export failed — try again')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" aria-label="Export board options">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem onSelect={handleExportPng}>
          <Download className="mr-2 h-4 w-4" />
          Export PNG
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleExportPdf}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DropdownMenuItem disabled={isAnonymous} onSelect={handlePostToUniShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Post to UniShare
                </DropdownMenuItem>
              </span>
            </TooltipTrigger>
            {isAnonymous && (
              <TooltipContent>
                <p>Sign in to post to UniShare</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type RoomVisibility = 'OPEN' | 'VIEW_ONLY' | 'PRIVATE'

const VISIBILITY_OPTIONS: { value: RoomVisibility; label: string; description: string }[] = [
  { value: 'OPEN', label: 'Open', description: 'Everyone can edit' },
  { value: 'VIEW_ONLY', label: 'View-only', description: 'Guests can view, signed-in users edit' },
  { value: 'PRIVATE', label: 'Private', description: 'Only signed-in users can access' },
]

function SettingsPopover() {
  const { ownerId, userId } = useCollab()
  const { slug } = useParams<{ slug: string }>()
  const [visibility, setVisibility] = useState<RoomVisibility>('OPEN')
  const [isLoaded, setIsLoaded] = useState(false)

  // Only render for owner
  if (userId !== ownerId || !ownerId) return null

  // Fetch current visibility on first render
  if (!isLoaded) {
    fetch(`/api/rooms/${slug}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setVisibility(data.data?.visibility ?? 'OPEN')
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }

  const handleVisibilityChange = async (newVisibility: RoomVisibility) => {
    const previousVisibility = visibility
    setVisibility(newVisibility) // Optimistic update

    try {
      const res = await fetch(`/api/rooms/${slug}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })

      if (!res.ok) {
        setVisibility(previousVisibility) // Rollback
        toast.error('Failed to update room settings')
        return
      }

      toast.success(
        newVisibility === 'OPEN'
          ? 'Room is now open — everyone can edit'
          : newVisibility === 'VIEW_ONLY'
            ? 'Room is now view-only for guests'
            : 'Room is now private',
      )
    } catch {
      setVisibility(previousVisibility) // Rollback
      toast.error('Failed to update room settings')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Room settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-foreground">Room access</h4>
            <p className="text-xs text-muted-foreground">Control who can view and edit</p>
          </div>

          <RadioGroup
            value={visibility}
            onValueChange={(val) => handleVisibilityChange(val as RoomVisibility)}
            className="space-y-2"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3">
                <RadioGroupItem value={opt.value} id={`vis-${opt.value}`} className="mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <Label
                    htmlFor={`vis-${opt.value}`}
                    className="cursor-pointer text-sm font-medium leading-none"
                  >
                    {opt.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleCopyLink}>
            <ClipboardCopy className="h-4 w-4" />
            Copy link
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function CanvasHeader() {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link — copy it from the address bar')
    }
  }

  return (
    <header className="relative z-10 flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <Link
        href="/feed"
        aria-label="Back to UniShare feed"
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <Image
          src="/icon.svg"
          alt="UniShare logo"
          width={24}
          height={24}
          className="rounded-[4px]"
        />
        <span className="font-mono text-[14px] font-bold tracking-tight">Unishare</span>
      </Link>

      <div className="flex items-center gap-3">
        <ParticipantAvatars />
        <SettingsPopover />
        <ExportDropdown />
        <Button variant="default" size="sm" onClick={handleCopyLink} className="gap-1">
          <ClipboardCopy className="h-4 w-4" />
          Copy link
        </Button>
      </div>
    </header>
  )
}

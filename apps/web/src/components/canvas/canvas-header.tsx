'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ClipboardCopy, Download, FileText, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { exportPng, exportPdf } from './export-utils'

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
    // Implemented in Plan 03
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
        <ExportDropdown />
        <Button variant="default" size="sm" onClick={handleCopyLink} className="gap-1">
          <ClipboardCopy className="h-4 w-4" />
          Copy link
        </Button>
      </div>
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DoorClosed, Loader2 } from 'lucide-react'
import { CanvasHeader } from '@/src/components/canvas/canvas-header'
import { CursorOverlay } from '@/src/components/canvas/cursor-overlay'
import { CollabProvider, useCollab, useCollabPresence } from '@/contexts/collab-context'

const ExcalidrawWrapper = dynamic(() => import('@/src/components/canvas/excalidraw-wrapper'), {
  ssr: false,
})

type JoinState = 'joining' | 'joined' | 'not-found'

export default function CanvasPage() {
  const { slug } = useParams<{ slug: string }>()
  const [joinState, setJoinState] = useState<JoinState>('joining')
  const [isAnonymous, setIsAnonymous] = useState(false)

  useEffect(() => {
    const joinRoom = async (retried = false): Promise<void> => {
      try {
        const res = await fetch(`/api/rooms/${slug}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          setIsAnonymous(data.data?.isAnonymous ?? false)
          setJoinState('joined')
          return
        }
        if (res.status === 404) {
          setJoinState('not-found')
          return
        }
        // Non-404 error (401/403 cookie timing) — retry once after 500ms
        if (!retried) {
          await new Promise((r) => setTimeout(r, 500))
          return joinRoom(true)
        }
        setJoinState('not-found')
      } catch {
        setJoinState('not-found')
      }
    }
    joinRoom()
  }, [slug])

  // Error page — Surface 3 from UI-SPEC
  if (joinState === 'not-found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <DoorClosed className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Room not found</h1>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          This room doesn&apos;t exist or the link may have expired.
        </p>
        <Button asChild variant="default">
          <Link href="/feed">Back to UniShare</Link>
        </Button>
      </div>
    )
  }

  // Loading overlay while HTTP join in-flight
  if (joinState === 'joining') {
    return (
      <div
        className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-background"
        role="status"
        aria-live="polite"
        aria-label="Connecting to collaboration room"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Connecting to room...</p>
      </div>
    )
  }

  // Join succeeded — mount CollabProvider which opens socket
  return (
    <CollabProvider slug={slug} isAnonymous={isAnonymous}>
      <CanvasInner />
    </CollabProvider>
  )
}

function CanvasInner() {
  const { connectionStatus } = useCollab()
  const { emitCursorMove } = useCollabPresence()

  if (connectionStatus === 'connecting') {
    return (
      <div
        className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-background"
        role="status"
        aria-live="polite"
        aria-label="Connecting to collaboration room"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Connecting to room...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <CanvasHeader />
      <main className="relative flex-1 overflow-hidden" onPointerMove={emitCursorMove}>
        <ExcalidrawWrapper />
        <CursorOverlay />
      </main>
    </div>
  )
}

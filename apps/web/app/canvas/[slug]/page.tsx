'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DoorClosed, Loader2, Lock } from 'lucide-react'
import { CanvasHeader } from '@/src/components/canvas/canvas-header'
import { CursorOverlay } from '@/src/components/canvas/cursor-overlay'
import { CollabProvider, useCollab, useCollabPresence } from '@/contexts/collab-context'

const ExcalidrawWrapper = dynamic(() => import('@/src/components/canvas/excalidraw-wrapper'), {
  ssr: false,
})

type JoinState = 'joining' | 'joined' | 'not-found' | 'private'

export default function CanvasPage() {
  const { slug } = useParams<{ slug: string }>()
  const [joinState, setJoinState] = useState<JoinState>('joining')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isViewOnly, setIsViewOnly] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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
          setIsViewOnly(data.data?.isViewOnly ?? false)
          setOwnerId(data.data?.ownerId ?? null)
          setUserId(data.data?.userId ?? null)
          setJoinState('joined')
          return
        }
        if (res.status === 403) {
          setJoinState('private')
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

  // Private gate — anonymous user blocked from PRIVATE room
  if (joinState === 'private') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">This board is private</h1>
        <p className="text-sm text-muted-foreground">Sign in to access this board.</p>
        <Button asChild variant="default">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    )
  }

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
    <CollabProvider
      slug={slug}
      isAnonymous={isAnonymous}
      isViewOnly={isViewOnly}
      ownerId={ownerId}
      userId={userId}
    >
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

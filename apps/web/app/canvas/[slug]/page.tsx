'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DoorClosed, Loader2 } from 'lucide-react'
import { CanvasHeader } from '@/src/components/canvas/canvas-header'

type PageState = 'loading' | 'connected' | 'not-found'

export default function CanvasPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${slug}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.status === 404) {
          setPageState('not-found')
          return
        }
        if (!res.ok) {
          setPageState('not-found')
          return
        }
        setPageState('connected')
      } catch {
        setPageState('not-found')
      }
    }
    joinRoom()
  }, [slug])

  // Error page — Surface 3 from UI-SPEC
  if (pageState === 'not-found') {
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

  // Loading overlay — Surface 2 from UI-SPEC
  if (pageState === 'loading') {
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

  // Connected state — canvas shell (Excalidraw mounted here in Plan 03)
  return (
    <div className="flex h-screen flex-col">
      <CanvasHeader />
      <main className="relative flex-1">
        {/* Excalidraw will be mounted here by Plan 03 */}
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Canvas loading...
        </div>
      </main>
    </div>
  )
}

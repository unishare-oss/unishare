'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DoorClosed, KeyRound, Loader2, Lock } from 'lucide-react'
import { CanvasHeader } from '@/src/components/canvas/canvas-header'
import { CursorOverlay } from '@/src/components/canvas/cursor-overlay'
import { CollabProvider, useCollab, useCollabPresence } from '@/contexts/collab-context'

const ExcalidrawWrapper = dynamic(() => import('@/src/components/canvas/excalidraw-wrapper'), {
  ssr: false,
})

type JoinState = 'joining' | 'joined' | 'not-found' | 'private' | 'password-required'

export default function CanvasPage() {
  const { slug } = useParams<{ slug: string }>()
  const [joinState, setJoinState] = useState<JoinState>('joining')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isViewOnly, setIsViewOnly] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const joinRoom = async (retried = false, password?: string): Promise<void> => {
    try {
      const pwVerified = sessionStorage.getItem(`pw-verified-${slug}`)
      const body: Record<string, unknown> = {}
      if (password !== undefined) {
        body.password = password
      } else if (pwVerified) {
        body.pwVerified = true
      }

      const res = await fetch(`/api/rooms/${slug}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setIsAnonymous(data.data?.isAnonymous ?? false)
        setIsViewOnly(data.data?.isViewOnly ?? false)
        setOwnerId(data.data?.ownerId ?? null)
        setUserId(data.data?.userId ?? null)
        sessionStorage.setItem(`pw-verified-${slug}`, '1')
        setJoinState('joined')
        return
      }
      if (res.status === 401) {
        // Password required or wrong password — NEVER retry (not a transient error)
        if (password !== undefined) {
          // User submitted a password and it was wrong
          setPasswordError('Incorrect password')
          setShake(true)
          setTimeout(() => setShake(false), 350)
          setPasswordSubmitting(false)
        } else if (pwVerified) {
          // Had a sessionStorage flag but password changed — clear and show gate
          sessionStorage.removeItem(`pw-verified-${slug}`)
          setJoinState('password-required')
        } else {
          setJoinState('password-required')
        }
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
      // Transient error — retry once (cookie timing race from Phase 6)
      if (!retried) {
        await new Promise((r) => setTimeout(r, 500))
        return joinRoom(true, password)
      }
      setJoinState('not-found')
    } catch {
      setJoinState('not-found')
    }
  }

  useEffect(() => {
    joinRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = passwordInputRef.current?.value ?? ''
    if (!password) return
    setPasswordError(null)
    setPasswordSubmitting(true)
    await joinRoom(false, password)
  }

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

  // Password gate — room requires a password to join (D-16 through D-22)
  if (joinState === 'password-required') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <KeyRound className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">This board is password protected</h1>
        <p className="text-sm text-muted-foreground">Enter the password to join.</p>
        <form onSubmit={handlePasswordSubmit} className="flex w-full max-w-xs flex-col gap-4">
          <div>
            <Input
              ref={passwordInputRef}
              type="password"
              placeholder="Password"
              aria-label="Room password"
              aria-describedby="pw-error"
              className={shake ? 'animate-shake' : ''}
              disabled={passwordSubmitting}
              autoFocus
            />
            {passwordError && (
              <p id="pw-error" role="alert" className="mt-1 text-xs text-destructive">
                {passwordError}
              </p>
            )}
          </div>
          <Button type="submit" variant="default" className="w-full" disabled={passwordSubmitting}>
            {passwordSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Board'
            )}
          </Button>
        </form>
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

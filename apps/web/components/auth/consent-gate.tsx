'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { signInWithUniauth } from '@/src/lib/auth/uniauth'
import { signOut } from '@/src/lib/auth/sign-out'

const REFRESH_KEY = 'unishare:shared-terms-refresh'

/** Refresh an older local session; only UniAuth records shared acceptance. */
export function ConsentGate() {
  const started = useRef(false)
  const [error, setError] = useState('')
  const connect = useCallback(async () => {
    if (sessionStorage.getItem(REFRESH_KEY)) {
      setError('Could not confirm shared acceptance. Please try signing in again.')
      return
    }
    sessionStorage.setItem(REFRESH_KEY, '1')
    try {
      await signInWithUniauth({ returnTo: window.location.href })
    } catch {
      setError('Could not connect to UniAuth. Please try again.')
    }
  }, [])
  useEffect(() => {
    if (started.current) return
    started.current = true
    void connect()
  }, [connect])
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <p role={error ? 'alert' : 'status'}>{error || 'Connecting to your Unicorp account…'}</p>
      {error && (
        <Button
          onClick={() => {
            sessionStorage.removeItem(REFRESH_KEY)
            setError('')
            void connect()
          }}
        >
          Try again
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          void signOut()
        }}
      >
        Sign out
      </Button>
    </main>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { safeReturnPath, signInWithUniauth } from '@/src/lib/auth/uniauth'

/**
 * Where links to uniauth (account page, university picker) come back to: one silent sign-in,
 * even when already signed in, so what changed on uniauth reaches the session, then on to
 * `?to=`. Outside the (auth) group on purpose: its GuestGuard turns signed-in users away.
 */
export default function UniauthRefreshPage() {
  const started = useRef(false)

  useEffect(() => {
    // Strict mode runs effects twice; one redirect to uniauth is enough.
    if (started.current) return
    started.current = true
    const to = safeReturnPath(new URLSearchParams(window.location.search).get('to'))
    void signInWithUniauth({ returnTo: `${window.location.origin}${to}`, silent: true })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-text-muted">Updating your profile…</p>
    </div>
  )
}

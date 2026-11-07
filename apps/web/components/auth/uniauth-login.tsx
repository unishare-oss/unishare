'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/src/lib/auth/client'
import { safeReturnPath, signInWithUniauth, silentCheckDone } from '@/src/lib/auth/uniauth'

// Errors uniauth can hand back on the callback. login_required only comes from the silent
// check and is not an error from the user's point of view.
const errorMessages: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  BANNED_USER: 'Your Unishare account has been suspended.',
  account_not_linked:
    'This email already has a Unishare account that is not linked to uniauth yet. Contact support.',
}

/** AUTH_MODE=uniauth login: one button to uniauth's central sign-in, plus guest access. */
export function UniauthLogin() {
  const params = useSearchParams()
  // The proxy passes the protected page as ?next=.
  const next = safeReturnPath(params.get('next'))
  const error = params.get('error')
  // Someone signed in on another app reaches a protected page signed out here: check
  // uniauth silently first and only show the button if they aren't signed in there.
  // Decided once on mount (GuestGuard renders this page client-side only, so document exists).
  const [checking, setChecking] = useState(() => !error && !silentCheckDone())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!checking) return
    // Signed in elsewhere → straight to `next`. Not signed in → back to this page, where the
    // button now shows (the check is remembered), instead of bouncing to `next` as a guest.
    signInWithUniauth({
      returnTo: `${window.location.origin}${next}`,
      errorReturnTo: window.location.href,
      silent: true,
    }).catch(() => setChecking(false))
  }, [checking, next])
  const message =
    error && error !== 'login_required'
      ? (errorMessages[error] ?? 'Sign-in failed. Please try again.')
      : ''

  async function continueWithUniauth() {
    setLoading(true)
    await signInWithUniauth({ returnTo: `${window.location.origin}${next}` }).catch(() =>
      setLoading(false),
    )
  }

  // Content needs a session, so a guest gets an anonymous one; it then picks a university.
  async function continueAsGuest() {
    setLoading(true)
    const { error } = await authClient.signIn.anonymous()
    if (error) {
      setLoading(false)
      toast.error('Could not start a guest session. Please try again.')
      return
    }
    window.location.assign(next)
  }

  if (checking) return null

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-[55%] bg-surface-dark p-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.svg"
            alt="Unishare logo"
            width={28}
            height={28}
            className="rounded-[6px]"
          />
          <span className="font-mono text-lg font-bold text-[#F7F3EE]">Unishare</span>
        </div>
        <blockquote className="max-w-xl">
          <p className="text-4xl xl:text-5xl font-extrabold leading-[1.15] text-[#F7F3EE] tracking-tight text-balance">
            Every lecture note and study guide {'—'}{' '}
            <span className="hand-underline text-[#fbbf24]">shared</span>{' '}
            {'by students who’ve been there.'}
          </p>
        </blockquote>
        <div />
      </div>

      <div className="flex flex-col items-center justify-center flex-1 bg-background px-6">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <Image
            src="/icon.svg"
            alt="Unishare logo"
            width={32}
            height={32}
            className="rounded-[6px]"
          />
          <span className="font-mono text-lg font-bold text-foreground">Unishare</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-foreground text-center">Sign in</h1>
          <p className="text-sm text-text-secondary text-center mt-2 mb-8">
            One unicorp account for Unishare and every other unicorp app
          </p>

          <Button onClick={continueWithUniauth} disabled={loading} className="w-full h-10.5">
            {loading ? 'Redirecting…' : 'Continue'}
          </Button>
          {message && <p className="text-xs text-destructive mt-3 text-center">{message}</p>}
          <p className="text-xs text-text-muted text-center mt-4">
            By continuing you agree to Unishare&rsquo;s{' '}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>

          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={continueAsGuest}
              disabled={loading}
              className="text-sm text-text-muted hover:text-foreground transition-colors duration-150 disabled:opacity-50"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

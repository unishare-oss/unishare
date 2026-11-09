import { authClient } from './client'
import { uniauthURL } from './mode'

/**
 * A signed-out visitor is silently checked at most once per 10 minutes across all tabs, so
 * browsing signed-out doesn't bounce through uniauth on every page, yet signing in on another
 * app is still picked up soon after.
 */
const CHECKED_COOKIE = 'unishare_uniauth_checked'
const CHECK_INTERVAL_SECONDS = 600

function markSilentChecked() {
  document.cookie = `${CHECKED_COOKIE}=1; Max-Age=${CHECK_INTERVAL_SECONDS}; Path=/; SameSite=Lax`
}

const CRAWLER = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly/i

/** True when a silent check shouldn't run now: done recently, or not a person browsing. */
export function silentCheckDone() {
  if (CRAWLER.test(navigator.userAgent)) return true
  return document.cookie.split('; ').some((c) => c.startsWith(`${CHECKED_COOKIE}=`))
}

/** Where to go back to if uniauth answers with an error (see app/auth/return). */
const RETURN_KEY = 'unishare:uniauth-return-to'

/** Reads and clears the page a sign-in attempt started from. */
export function takeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    // Only same-origin paths: this value decides a redirect.
    return value && new URL(value, window.location.origin).origin === window.location.origin
      ? value
      : null
  } catch {
    return null
  }
}

/**
 * `value` if it is a path on this app, else /feed. It decides a redirect, so it is checked the
 * way the browser will read it: URL parsing drops tabs and newlines, turns `\` into `/` and
 * resolves `.` and `..`, so `/\n/host`, `/\host` or `/.//host` would leave the site. The parsed
 * path is checked too: `//host` passes the origin check but is another site to the browser.
 */
export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith('/')) return '/feed'
  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin && !url.pathname.startsWith('//')
      ? url.pathname + url.search + url.hash
      : '/feed'
  } catch {
    return '/feed'
  }
}

/**
 * Starts sign-in on uniauth and comes back to `returnTo`. `silent` asks with prompt=none:
 * uniauth returns straight away, signed in if the user already is, or with
 * `?error=login_required` (they stay a guest) — no page is ever shown.
 */
export async function signInWithUniauth({
  returnTo,
  errorReturnTo,
  silent = false,
}: {
  returnTo: string
  /** Where to land when uniauth says no (e.g. login_required); defaults to returnTo. */
  errorReturnTo?: string
  silent?: boolean
}) {
  markSilentChecked()
  try {
    sessionStorage.setItem(RETURN_KEY, errorReturnTo ?? returnTo)
  } catch {
    // Without storage an error just lands on /feed.
  }
  // Better Auth 1.7 registers genericOAuth providers as social providers. A failed request
  // resolves with `error` instead of rejecting; throw it so callers' catch runs.
  const { error } = await authClient.signIn.social({
    provider: 'uniauth',
    callbackURL: returnTo,
    // Every error goes through /auth/return: login_required quietly returns to returnTo,
    // anything else (e.g. BANNED_USER) is explained on /login.
    errorCallbackURL: `${window.location.origin}/auth/return`,
    ...(silent && { additionalParams: { prompt: 'none' } }),
  })
  if (error) throw new Error(error.message ?? 'Sign-in could not start')
}

/**
 * Ends the unishare session, then uniauth's: its /logout page signs out there (which tells
 * every other app through back-channel logout) and comes back here. Not the OIDC end-session
 * endpoint: without a usable id_token_hint that shows Better Auth's unstyled confirmation page.
 */
export async function signOutOfUniauth() {
  await authClient.signOut()
  markSilentChecked()
  window.location.assign(
    `${uniauthURL}/logout?redirect=${encodeURIComponent(`${window.location.origin}/`)}`,
  )
}

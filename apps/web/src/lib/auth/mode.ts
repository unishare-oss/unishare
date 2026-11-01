/**
 * People sign in on uniauth's central pages and unishare gets its own session through OAuth;
 * account security (password, linked accounts, name/avatar) lives on uniauth.
 * NEXT_PUBLIC_* values are baked into the image at build time.
 */

/** uniauth origin, e.g. https://auth.psstee.me. */
export const uniauthURL = (process.env.NEXT_PUBLIC_UNIAUTH_URL ?? 'http://localhost:3002').replace(
  /\/+$/,
  '',
)

/** This app's public origin; the same on server and client, so links don't mismatch on hydration. */
const appURL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

/**
 * Back to `path` through /auth/refresh, which signs in silently again so changes made on
 * uniauth (e.g. a newly picked university) show up without signing out. Only the signed token
 * carries them; nothing about the user travels in the URL.
 */
function refreshURL(path: string) {
  return `${appURL}/auth/refresh?to=${encodeURIComponent(path)}`
}

/** uniauth's account page, with a way back to `path` on this app. */
export function uniauthAccountURL(path: string) {
  return `${uniauthURL}/account?redirect=${encodeURIComponent(refreshURL(path))}`
}

/** uniauth's university picker, with a way back to `path` on this app. */
export function uniauthPickUniversityURL(path: string) {
  return `${uniauthURL}/select-university?redirect=${encodeURIComponent(refreshURL(path))}`
}

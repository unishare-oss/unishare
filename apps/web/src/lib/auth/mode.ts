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

/** uniauth's account page, with a way back to `path` on this app. */
export function uniauthAccountURL(path: string) {
  return `${uniauthURL}/account?redirect=${encodeURIComponent(`${appURL}${path}`)}`
}

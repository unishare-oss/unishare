/**
 * External hosts next/image may load from. One list for next.config.ts (which rejects
 * anything else at runtime) and for components that render user-supplied URLs — avatars now
 * come from uniauth, where users can enter any URL, and an unlisted host would crash the page.
 */
export const imageHosts = [
  'lh3.googleusercontent.com',
  '*.googleusercontent.com',
  'avatars.githubusercontent.com',
  '*.windows.net',
  '*.r2.cloudflarestorage.com',
  '*.r2.dev',
  'upload.wikimedia.org',
  's3.psstee.dev',
  // Photos uploaded on uniauth's account page (/api/avatars/…).
  'auth.psstee.dev',
  'auth-dev.psstee.dev',
] as const

/** True when next/image can render `src`: a relative path, or https on a listed host. */
export function isRenderableImage(src: string): boolean {
  if (src.startsWith('/')) return true
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  return imageHosts.some((host) =>
    host.startsWith('*.') ? url.hostname.endsWith(host.slice(1)) : url.hostname === host,
  )
}

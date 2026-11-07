import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { uniauthConfig } from '@/auth/uniauth-config'

export const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'
/** uniauth's retired account notices (replaced by v1 identity events): a token carrying one is never a logout. */
const RETIRED_EVENTS = ['urn:uniauth:event:user-deleted', 'urn:uniauth:event:user-updated']

/** uniauth's signing keys, fetched lazily and cached: ONE key set shared by back-channel logout and v1 identity events. */
export const jwks = createRemoteJWKSet(new URL(`${uniauthConfig.issuer}/jwks`))

/**
 * The core of every uniauth event check: signed with uniauth's key, issued by it, for one of `audience` (the login client
 * for back-channel logout, the machine client for v1 identity events), not expired. Null if any of that fails.
 */
export async function verifyUniauthJwt(
  token: string,
  audience: string | string[],
): Promise<JWTPayload | null> {
  try {
    return (await jwtVerify(token, jwks, { issuer: uniauthConfig.issuer, audience })).payload
  } catch {
    return null
  }
}

/**
 * Verifies a server-to-server event token from uniauth for the login client (back-channel
 * logout) and returns its subject, the uniauth user id, with the event's data. Only the
 * signature, issuer and audience are trusted, and the token must carry exactly the expected
 * event: one that also carries a retired account notice is refused. Tokens with a nonce are
 * refused so an ID token can't be replayed as one (Back-Channel Logout §2.6).
 */
export async function verifyUniauthEventData(
  token: string,
  event: string,
): Promise<{ sub: string; sid: string | null; data: Record<string, unknown> } | null> {
  const payload = await verifyUniauthJwt(token, uniauthConfig.clientId)
  if (!payload) return null
  const events = payload.events as Record<string, unknown> | undefined
  const data = events?.[event]
  if (!events || !data || typeof data !== 'object' || 'nonce' in payload) return null
  if ([LOGOUT_EVENT, ...RETIRED_EVENTS].some((other) => other !== event && other in events))
    return null
  return typeof payload.sub === 'string'
    ? {
        sub: payload.sub,
        sid: typeof payload.sid === 'string' ? payload.sid : null,
        data: data as Record<string, unknown>,
      }
    : null
}

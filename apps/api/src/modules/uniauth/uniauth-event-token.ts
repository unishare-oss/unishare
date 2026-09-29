import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { uniauthConfig } from '@/auth/uniauth-config'

export const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'
export const USER_DELETED_EVENT = 'urn:uniauth:event:user-deleted'
export const USER_UPDATED_EVENT = 'urn:uniauth:event:user-updated'
const EVENTS = [LOGOUT_EVENT, USER_DELETED_EVENT, USER_UPDATED_EVENT]

const jwks = createRemoteJWKSet(new URL(`${uniauthConfig.issuer}/jwks`))

/**
 * Verifies a server-to-server event token from uniauth (back-channel logout, account
 * deletion, profile update) and returns its subject, the uniauth user id, with the event's
 * data. Only the signature, issuer and audience are trusted, and the token must carry exactly
 * the expected event: a logout token is never accepted as a deletion, or the other way round.
 * Tokens with a nonce are refused so an ID token can't be replayed as either (Back-Channel
 * Logout §2.6).
 */
export async function verifyUniauthEventData(
  token: string,
  event: string,
): Promise<{ sub: string; sid: string | null; data: Record<string, unknown> } | null> {
  let payload: JWTPayload
  try {
    ;({ payload } = await jwtVerify(token, jwks, {
      issuer: uniauthConfig.issuer,
      audience: uniauthConfig.clientId,
    }))
  } catch {
    return null
  }
  const events = payload.events as Record<string, unknown> | undefined
  const data = events?.[event]
  if (!events || !data || typeof data !== 'object' || 'nonce' in payload) return null
  if (EVENTS.some((other) => other !== event && other in events)) return null
  return typeof payload.sub === 'string'
    ? {
        sub: payload.sub,
        sid: typeof payload.sid === 'string' ? payload.sid : null,
        data: data as Record<string, unknown>,
      }
    : null
}

/** verifyUniauthEventData for events that carry no data: just the uniauth user id. */
export async function verifyUniauthEvent(token: string, event: string): Promise<string | null> {
  return (await verifyUniauthEventData(token, event))?.sub ?? null
}

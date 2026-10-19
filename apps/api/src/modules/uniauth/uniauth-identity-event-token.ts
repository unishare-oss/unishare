import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { uniauthConfig, uniauthDirectoryConfig } from '@/auth/uniauth-config'

export const IDENTITY_EVENT = 'urn:uniauth:event:identity'
export const CONNECTION_CHECK_EVENT = 'urn:uniauth:event:connection-check'

/** A v1 identity event: no profile, only what changed for whom and in which version. */
export interface IdentityEvent {
  eventId: string
  type: string
  /** The person's uniauth id. */
  subject: string
  identityVersion: number
}

export type IdentityEventResult =
  | { kind: 'event'; event: IdentityEvent }
  /** The dashboard's connection check: acknowledge, do nothing. */
  | { kind: 'check' }
  /** 401: a token uniauth will retry. */
  | { kind: 'unverified' }
  /** 400: a verified token this receiver cannot use; uniauth treats it as final. */
  | { kind: 'malformed' }

const jwks = createRemoteJWKSet(new URL(`${uniauthConfig.issuer}/jwks`))

/**
 * Verifies a v1 identity event token: signed with uniauth's key, issued by it, for one of this app's machine clients
 * (several during a credential rotation), carrying exactly one event of a known kind and schema version, about the
 * token's own subject.
 */
export async function verifyIdentityEvent(token: string): Promise<IdentityEventResult> {
  let payload: JWTPayload
  try {
    ;({ payload } = await jwtVerify(token, jwks, {
      issuer: uniauthConfig.issuer,
      audience: uniauthDirectoryConfig().audiences,
    }))
  } catch {
    return { kind: 'unverified' }
  }
  const events = payload.events as Record<string, unknown> | undefined
  if (
    !events ||
    typeof events !== 'object' ||
    Object.keys(events).length !== 1 ||
    'nonce' in payload
  ) {
    return { kind: 'malformed' }
  }
  if (CONNECTION_CHECK_EVENT in events) return { kind: 'check' }
  const event = events[IDENTITY_EVENT] as Record<string, unknown> | undefined
  if (
    !event ||
    event.schemaVersion !== 1 ||
    typeof event.eventId !== 'string' ||
    typeof event.type !== 'string' ||
    typeof event.subject !== 'string' ||
    !Number.isInteger(event.identityVersion) ||
    payload.sub !== event.subject
  ) {
    return { kind: 'malformed' }
  }
  return {
    kind: 'event',
    event: {
      eventId: event.eventId,
      type: event.type,
      subject: event.subject,
      identityVersion: event.identityVersion as number,
    },
  }
}

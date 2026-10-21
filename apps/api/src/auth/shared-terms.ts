import { createRemoteJWKSet, jwtVerify } from 'jose'
import { uniauthConfig } from './uniauth-config'

const keys = createRemoteJWKSet(new URL(`${uniauthConfig.issuer}/jwks`))

export async function verifiedSharedTerms(token: string, subject: string) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: uniauthConfig.issuer,
    audience: uniauthConfig.clientId,
    requiredClaims: ['exp', 'iat', 'sub'],
  })
  if (payload.sub !== subject || payload.events) throw new Error('Invalid UniAuth identity binding')
  return sharedTerms(payload)
}

export function sharedTerms(profile: Record<string, unknown>) {
  const value = profile['urn:unicorp:terms'] as
    { version?: unknown; acceptedAt?: unknown } | undefined
  const time = typeof value?.acceptedAt === 'string' ? Date.parse(value.acceptedAt) : NaN
  return value?.version === 1 && Number.isFinite(time) && time > 0
    ? { unicorpTermsVersion: 1, unicorpTermsAcceptedAt: new Date(time) }
    : { unicorpTermsVersion: null, unicorpTermsAcceptedAt: null }
}

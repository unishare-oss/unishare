/**
 * unishare signs people in through uniauth (OIDC, provider id `uniauth`) and keeps only its
 * own session, roles and bans in Better Auth. Passwords and Google/Microsoft sign-in live in
 * uniauth (docs/uniauth/planning-oidc.md).
 */

/** Provider id in genericOAuth, the callback path, and account.providerId. */
export const UNIAUTH_PROVIDER_ID = 'uniauth'

function required(key: string, testValue: string): string {
  const value = process.env[key]
  if (value) return value
  // Unit tests import the auth config without a uniauth to talk to.
  if (process.env.NODE_ENV === 'test') return testValue
  throw new Error(`Missing required environment variable: ${key}`)
}

export const uniauthConfig = {
  // e.g. https://auth.psstee.dev/api/auth
  issuer: required('UNIAUTH_ISSUER', 'http://uniauth.test/api/auth').replace(/\/+$/, ''),
  clientId: required('UNIAUTH_CLIENT_ID', 'unishare-test'),
  clientSecret: required('UNIAUTH_CLIENT_SECRET', 'unishare-test-secret'),
}

/**
 * The machine credential (client_credentials) uniauth issued for the identity directory, and the client ids v1 identity
 * events are addressed to: the machine client, plus UNIAUTH_EVENTS_EXTRA_AUDIENCES (comma-separated) while a credential
 * rotation overlaps. Both unset means the directory is off: updates then cannot be fetched and reconciliation does not run.
 */
export function uniauthDirectoryConfig() {
  const clientId = process.env.UNIAUTH_DIRECTORY_CLIENT_ID || undefined
  const clientSecret = process.env.UNIAUTH_DIRECTORY_CLIENT_SECRET || undefined
  if (!!clientId !== !!clientSecret) {
    throw new Error(
      'Set both UNIAUTH_DIRECTORY_CLIENT_ID and UNIAUTH_DIRECTORY_CLIENT_SECRET, or neither',
    )
  }
  const audiences = [clientId, ...(process.env.UNIAUTH_EVENTS_EXTRA_AUDIENCES ?? '').split(',')]
    .map((a) => a?.trim())
    .filter((a): a is string => !!a)
  return { clientId, clientSecret, audiences, origin: new URL(uniauthConfig.issuer).origin }
}

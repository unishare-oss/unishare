import type { PrismaClient } from '../generated/prisma/client'
import { sharedTerms } from './shared-terms'

/** uniauth puts university memberships here (ID token + userinfo). */
export const ORGANIZATIONS_CLAIM = 'urn:uniauth:organizations'

/** mapUniauthProfile's "no avatar" (see there). */
export const NO_AVATAR = ''

/** Stores NO_AVATAR as null, on create and on the sign-in update. */
export function withoutAvatarPlaceholder<T extends { image?: string | null }>(data: T): T {
  return data.image === NO_AVATAR ? { ...data, image: null } : data
}

/** One university membership, as uniauth sends it. `slug` is optional: tokens are external input. */
export interface UniauthMembership {
  id: string
  slug?: string
  verified: boolean
}

interface UniauthProfile {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string | null
  [ORGANIZATIONS_CLAIM]?: UniauthMembership[]
}

/**
 * Maps uniauth's userinfo onto the local user on every sign-in (overrideUserInfo): name
 * and avatar are always uniauth's. The university is not here: Better Auth drops input:false
 * fields from this mapping, so the session hook in auth.config.ts writes it (signInUniversity).
 */
export function mapUniauthProfile(raw: Record<string, unknown>) {
  const profile = raw as unknown as UniauthProfile
  // No id: the local user is matched through the account row (accountId = sub), never by id.
  return {
    email: profile.email,
    emailVerified: profile.email_verified === true,
    name: profile.name || profile.email,
    // Better Auth 1.7 ignores an undefined image, so a removed uniauth avatar would never
    // clear here. '' says "no avatar"; the user hooks in auth.config.ts store it as null.
    image: profile.picture || NO_AVATAR,
  }
}

/**
 * Copies what Better Auth drops from mapUniauthProfile (input:false fields) onto the user when a
 * session is created: the shared-terms evidence and the university, from the uniauth ID token
 * verified by `verify`. Guests have no uniauth account, so nothing is written for them.
 */
export async function copyFromUniauthIdToken(
  prisma: PrismaClient,
  user: { id: string; universityId: string | null },
  account: { idToken?: string | null; accountId: string } | undefined,
  verify: (token: string, subject: string) => Promise<Record<string, unknown>>,
) {
  if (!account?.idToken) return
  const claims = await verify(account.idToken, account.accountId)
  const university = await signInUniversity(prisma, user.universityId, claims)
  await prisma.user.update({
    where: { id: user.id },
    data: { ...sharedTerms(claims), ...university },
  })
}

/**
 * The university part of the sign-in update, from the verified ID token: it follows the uniauth
 * membership (verified first), and a user with no mapped membership keeps the one they have.
 */
export async function signInUniversity(
  prisma: PrismaClient,
  storedUniversityId: string | null,
  claims: Record<string, unknown>,
) {
  const memberships = claims[ORGANIZATIONS_CLAIM]
  const universityId = Array.isArray(memberships)
    ? await universityForMemberships(prisma, memberships as UniauthMembership[])
    : null
  return universityChange(storedUniversityId, universityId)
}

/**
 * The write for a university read from uniauth: nothing when none maps or it is unchanged, and a
 * changed one clears the department, which belonged to the old university.
 */
export function universityChange(storedUniversityId: string | null, universityId: string | null) {
  return universityId && universityId !== storedUniversityId
    ? { universityId, departmentId: null }
    : {}
}

export async function universityForMemberships(
  prisma: PrismaClient,
  memberships: UniauthMembership[],
): Promise<string | null> {
  // A membership without a slug (a token from before uniauth sent one) matches nothing
  const ordered = memberships.filter((m) => m.slug).sort((a, b) => +b.verified - +a.verified)
  if (!ordered.length) return null
  const universities = await prisma.university.findMany({
    where: { slug: { in: ordered.map((m) => m.slug!) } },
    select: { id: true, slug: true },
  })
  for (const m of ordered) {
    const match = universities.find((u) => u.slug === m.slug)
    if (match) return match.id
  }
  return null
}

/**
 * The uniauth session id (`sid`) in an ID token Better Auth already verified at sign-in and
 * stored on the account row. Only read, never trusted for anything but matching logouts.
 */
export function uniauthSidFromIdToken(idToken: string | null | undefined): string | null {
  const payload = idToken?.split('.')[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sid?: unknown
    }
    return typeof claims.sid === 'string' && claims.sid ? claims.sid : null
  } catch {
    return null
  }
}

import type { PrismaClient } from '../generated/prisma/client'

/** uniauth puts university memberships here (ID token + userinfo). */
export const ORGANIZATIONS_CLAIM = 'urn:uniauth:organizations'

/** mapUniauthProfile's "no avatar" (see there). */
export const NO_AVATAR = ''

/** Stores NO_AVATAR as null, on create and on the sign-in update. */
export function withoutAvatarPlaceholder<T extends { image?: string | null }>(data: T): T {
  return data.image === NO_AVATAR ? { ...data, image: null } : data
}

interface UniauthProfile {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string | null
  [ORGANIZATIONS_CLAIM]?: { id: string; verified: boolean }[]
}

/**
 * Maps uniauth's userinfo onto the local user on every sign-in (overrideUserInfo): name
 * and avatar are always uniauth's, and the university follows the uniauth membership
 * (verified first). A user with no mapped membership keeps whatever university they have.
 */
export function mapUniauthProfile(prisma: PrismaClient) {
  return async (raw: Record<string, unknown>) => {
    const profile = raw as unknown as UniauthProfile
    const universityId = await universityForMemberships(prisma, profile[ORGANIZATIONS_CLAIM] ?? [])
    // No id: the local user is matched through the account row (accountId = sub), never by id.
    return {
      email: profile.email,
      emailVerified: profile.email_verified === true,
      name: profile.name || profile.email,
      // Better Auth 1.7 ignores an undefined image, so a removed uniauth avatar would never
      // clear here. '' says "no avatar"; the user hooks in auth.config.ts store it as null.
      image: profile.picture || NO_AVATAR,
      ...(universityId && { universityId }),
    }
  }
}

export async function universityForMemberships(
  prisma: PrismaClient,
  memberships: { id: string; verified: boolean }[],
): Promise<string | null> {
  if (!memberships.length) return null
  const ordered = [...memberships].sort((a, b) => +b.verified - +a.verified)
  const universities = await prisma.university.findMany({
    where: { uniauthOrgId: { in: ordered.map((m) => m.id) } },
    select: { id: true, uniauthOrgId: true },
  })
  for (const m of ordered) {
    const match = universities.find((u) => u.uniauthOrgId === m.id)
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

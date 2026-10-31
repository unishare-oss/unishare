import type { PrismaClient } from '../generated/prisma/client'
import {
  NO_AVATAR,
  uniauthSidFromIdToken,
  withoutAvatarPlaceholder,
  mapUniauthProfile,
  ORGANIZATIONS_CLAIM,
  universityForMemberships,
} from './uniauth-sign-in'

function prismaWith(universities: { id: string; slug: string }[]) {
  return {
    university: {
      findMany: jest.fn(async ({ where }: { where: { slug: { in: string[] } } }) =>
        universities.filter((u) => where.slug.in.includes(u.slug)),
      ),
    },
  } as unknown as PrismaClient
}

const kmuttAndMfu = () =>
  prismaWith([
    { id: 'uni_kmutt', slug: 'kmutt' },
    { id: 'uni_mfu', slug: 'mfu' },
  ])

const profile = (extra: Record<string, unknown> = {}) => ({
  sub: 'ua_1',
  email: 'ada@kmutt.ac.th',
  email_verified: true,
  name: 'Ada',
  picture: 'https://img/ada.png',
  ...extra,
})

describe('mapUniauthProfile', () => {
  it('maps identity fields from uniauth, never the local id', async () => {
    const map = mapUniauthProfile(prismaWith([]))
    await expect(map(profile())).resolves.toEqual({
      email: 'ada@kmutt.ac.th',
      emailVerified: true,
      name: 'Ada',
      image: 'https://img/ada.png',
    })
  })

  it('prefers a verified membership when choosing the university', async () => {
    const map = mapUniauthProfile(kmuttAndMfu())
    const mapped = await map(
      profile({
        [ORGANIZATIONS_CLAIM]: [
          { id: 'org_kmutt', slug: 'kmutt', verified: false },
          { id: 'org_mfu', slug: 'mfu', verified: true },
        ],
      }),
    )
    expect(mapped).toMatchObject({ universityId: 'uni_mfu' })
  })

  it('leaves the university untouched when no membership maps to one', async () => {
    const map = mapUniauthProfile(kmuttAndMfu())
    const mapped = await map(
      profile({
        [ORGANIZATIONS_CLAIM]: [
          { id: 'org_x', slug: 'unknown', verified: true },
          { id: 'org_kmutt', verified: true },
        ],
      }),
    )
    expect(mapped).not.toHaveProperty('universityId')
  })

  it('treats a missing email_verified as unverified and falls back to the email for a name', async () => {
    const map = mapUniauthProfile(prismaWith([]))
    const mapped = await map(profile({ email_verified: undefined, name: '' }))
    expect(mapped).toMatchObject({ emailVerified: false, name: 'ada@kmutt.ac.th' })
  })

  it('says "no avatar" when uniauth has none, so a removed avatar clears here too', async () => {
    const map = mapUniauthProfile(prismaWith([]))
    await expect(map(profile({ picture: null }))).resolves.toMatchObject({ image: NO_AVATAR })
  })
})

describe('universityForMemberships', () => {
  it('matches by slug, verified memberships first', async () => {
    await expect(
      universityForMemberships(kmuttAndMfu(), [
        { id: 'org_kmutt', slug: 'kmutt', verified: false },
        { id: 'org_mfu', slug: 'mfu', verified: true },
      ]),
    ).resolves.toBe('uni_mfu')
  })

  it('returns null for an unknown slug', async () => {
    await expect(
      universityForMemberships(kmuttAndMfu(), [{ id: 'org_x', slug: 'unknown', verified: true }]),
    ).resolves.toBeNull()
  })

  it('returns null for a membership without a slug, even when its id is a university id', async () => {
    const prisma = kmuttAndMfu()
    await expect(
      universityForMemberships(prisma, [{ id: 'kmutt', verified: true }]),
    ).resolves.toBeNull()
    expect(prisma.university.findMany).not.toHaveBeenCalled()
  })
})

describe('withoutAvatarPlaceholder', () => {
  it('stores the placeholder as null and leaves real avatars alone', () => {
    expect(withoutAvatarPlaceholder({ name: 'Ada', image: NO_AVATAR })).toEqual({
      name: 'Ada',
      image: null,
    })
    expect(withoutAvatarPlaceholder({ image: 'https://img/ada.png' })).toEqual({
      image: 'https://img/ada.png',
    })
    expect(withoutAvatarPlaceholder({ bio: 'hi' })).toEqual({ bio: 'hi' })
  })
})

describe('uniauthSidFromIdToken', () => {
  const jwt = (claims: object) =>
    `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`

  it('reads the uniauth session id from a stored ID token', () => {
    expect(uniauthSidFromIdToken(jwt({ sub: 'ua_1', sid: 'sess-9' }))).toBe('sess-9')
  })

  it('returns null without a token, a sid, or a readable payload', () => {
    expect(uniauthSidFromIdToken(null)).toBeNull()
    expect(uniauthSidFromIdToken(jwt({ sub: 'ua_1' }))).toBeNull()
    expect(uniauthSidFromIdToken('not-a-jwt')).toBeNull()
    expect(uniauthSidFromIdToken('h.@@@.sig')).toBeNull()
  })
})

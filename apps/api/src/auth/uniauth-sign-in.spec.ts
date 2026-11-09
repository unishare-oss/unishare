import type { PrismaClient } from '../generated/prisma/client'
import {
  copyFromUniauthIdToken,
  NO_AVATAR,
  uniauthSidFromIdToken,
  withoutAvatarPlaceholder,
  mapUniauthProfile,
  ORGANIZATIONS_CLAIM,
  signInUniversity,
  universityChange,
  membershipsRemoved,
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
  it('maps identity fields from uniauth, never the local id or the university', () => {
    const mapped = mapUniauthProfile(
      profile({ [ORGANIZATIONS_CLAIM]: [{ id: 'org_kmutt', slug: 'kmutt', verified: true }] }),
    )
    // Better Auth drops input:false fields here; the session hook writes the university
    expect(mapped).toEqual({
      email: 'ada@kmutt.ac.th',
      emailVerified: true,
      name: 'Ada',
      image: 'https://img/ada.png',
    })
  })

  it('treats a missing email_verified as unverified and falls back to the email for a name', () => {
    const mapped = mapUniauthProfile(profile({ email_verified: undefined, name: '' }))
    expect(mapped).toMatchObject({ emailVerified: false, name: 'ada@kmutt.ac.th' })
  })

  it('says "no avatar" when uniauth has none, so a removed avatar clears here too', () => {
    expect(mapUniauthProfile(profile({ picture: null }))).toMatchObject({ image: NO_AVATAR })
  })
})

describe('signInUniversity', () => {
  const claims = (memberships: unknown) => profile({ [ORGANIZATIONS_CLAIM]: memberships })

  it('prefers a verified membership and clears the department when the university changes', async () => {
    await expect(
      signInUniversity(
        kmuttAndMfu(),
        'uni_kmutt',
        claims([
          { id: 'org_kmutt', slug: 'kmutt', verified: false },
          { id: 'org_mfu', slug: 'mfu', verified: true },
        ]),
      ),
    ).resolves.toEqual({ universityId: 'uni_mfu', departmentId: null })
  })

  it('sets a first university and clears any department', async () => {
    await expect(
      signInUniversity(kmuttAndMfu(), null, claims([{ id: 'o', slug: 'kmutt', verified: true }])),
    ).resolves.toEqual({ universityId: 'uni_kmutt', departmentId: null })
  })

  it('writes nothing, so the department stays, when the university is unchanged', async () => {
    await expect(
      signInUniversity(
        kmuttAndMfu(),
        'uni_kmutt',
        claims([{ id: 'o', slug: 'kmutt', verified: true }]),
      ),
    ).resolves.toEqual({})
  })

  it('leaves the university untouched when no membership maps to one', async () => {
    const prisma = kmuttAndMfu()
    await expect(
      signInUniversity(
        prisma,
        'uni_kmutt',
        claims([
          { id: 'org_x', slug: 'unknown', verified: true },
          { id: 'org_kmutt', verified: true },
        ]),
      ),
    ).resolves.toEqual({})
    await expect(signInUniversity(prisma, 'uni_kmutt', profile())).resolves.toEqual({})
  })

  it('clears the university and department when uniauth sends no memberships', async () => {
    await expect(signInUniversity(kmuttAndMfu(), 'uni_kmutt', claims([]))).resolves.toEqual({
      universityId: null,
      departmentId: null,
    })
  })
})

describe('copyFromUniauthIdToken', () => {
  const setup = () => {
    const prisma = kmuttAndMfu() as unknown as PrismaClient & { user: { update: jest.Mock } }
    Object.assign(prisma, { user: { update: jest.fn() } })
    const verify = jest.fn(async () =>
      profile({ [ORGANIZATIONS_CLAIM]: [{ id: 'o', slug: 'mfu', verified: true }] }),
    )
    return { prisma, verify }
  }
  const account = { idToken: 'id-token', accountId: 'ua_1' }
  const noTerms = { unicorpTermsVersion: null, unicorpTermsAcceptedAt: null }

  it('writes the new university and clears the department when it changed', async () => {
    const { prisma, verify } = setup()
    await copyFromUniauthIdToken(prisma, { id: 'u1', universityId: 'uni_kmutt' }, account, verify)
    expect(verify).toHaveBeenCalledWith('id-token', 'ua_1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { ...noTerms, universityId: 'uni_mfu', departmentId: null },
    })
  })

  it('writes only the terms evidence when the university is unchanged', async () => {
    const { prisma, verify } = setup()
    await copyFromUniauthIdToken(prisma, { id: 'u1', universityId: 'uni_mfu' }, account, verify)
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: noTerms })
  })

  it('writes nothing without a uniauth ID token', async () => {
    const { prisma, verify } = setup()
    await copyFromUniauthIdToken(prisma, { id: 'u1', universityId: null }, undefined, verify)
    await copyFromUniauthIdToken(
      prisma,
      { id: 'u1', universityId: null },
      { idToken: null, accountId: 'ua_1' },
      verify,
    )
    expect(verify).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('universityChange', () => {
  it('clears the department only when a mapped university differs from the stored one', () => {
    expect(universityChange('u1', 'u2')).toEqual({ universityId: 'u2', departmentId: null })
    expect(universityChange('u1', 'u1')).toEqual({})
    expect(universityChange('u1', null)).toEqual({})
  })

  it('clears the university and department when the memberships were removed', () => {
    expect(universityChange('u1', null, true)).toEqual({ universityId: null, departmentId: null })
    expect(universityChange(null, null, true)).toEqual({}) // nothing to clear
  })
})

describe('membershipsRemoved', () => {
  it('is true only for a sent, empty list', () => {
    expect(membershipsRemoved([])).toBe(true)
    expect(membershipsRemoved([{ id: 'o', slug: 'kmutt', verified: true }])).toBe(false)
    expect(membershipsRemoved(undefined)).toBe(false)
    expect(membershipsRemoved(null)).toBe(false)
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

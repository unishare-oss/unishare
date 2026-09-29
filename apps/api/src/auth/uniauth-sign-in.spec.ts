import type { PrismaClient } from '../generated/prisma/client'
import {
  NO_AVATAR,
  uniauthSidFromIdToken,
  withoutAvatarPlaceholder,
  mapUniauthProfile,
  ORGANIZATIONS_CLAIM,
} from './uniauth-sign-in'

function prismaWith(universities: { id: string; uniauthOrgId: string }[]) {
  return {
    university: { findMany: jest.fn().mockResolvedValue(universities) },
  } as unknown as PrismaClient
}

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
    const map = mapUniauthProfile(
      prismaWith([
        { id: 'uni_picked', uniauthOrgId: 'org_picked' },
        { id: 'uni_kmutt', uniauthOrgId: 'org_kmutt' },
      ]),
    )
    const mapped = await map(
      profile({
        [ORGANIZATIONS_CLAIM]: [
          { id: 'org_picked', verified: false },
          { id: 'org_kmutt', verified: true },
        ],
      }),
    )
    expect(mapped).toMatchObject({ universityId: 'uni_kmutt' })
  })

  it('leaves the university untouched when no membership maps to one', async () => {
    const map = mapUniauthProfile(prismaWith([]))
    const mapped = await map(profile({ [ORGANIZATIONS_CLAIM]: [{ id: 'org_x', verified: true }] }))
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

import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose'
import type { PrismaService } from '@/prisma/prisma.service'
import { UniauthLogoutService } from './uniauth-logout.service'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'
import { UniauthUserUpdatedService } from './uniauth-user-updated.service'
import { LOGOUT_EVENT, USER_DELETED_EVENT, USER_UPDATED_EVENT } from './uniauth-event-token'

const issuer = 'http://auth.test/api/auth'
const clientId = 'unishare-client'

jest.mock('@/auth/uniauth-config', () => ({
  uniauthConfig: { issuer: 'http://auth.test/api/auth', clientId: 'unishare-client' },
}))

const mockInternalAdapter = {
  deleteUserSessions: jest.fn(),
  deleteAccounts: jest.fn(),
  deleteUser: jest.fn(),
}
jest.mock('@/auth/auth.config', () => ({
  auth: {
    get $context() {
      return Promise.resolve({ internalAdapter: mockInternalAdapter })
    },
  },
}))

describe('uniauth event callbacks', () => {
  let privateKey: CryptoKey
  const realFetch = global.fetch
  let prisma: {
    account: { findFirst: jest.Mock }
    session: { deleteMany: jest.Mock }
    user: { update: jest.Mock }
    university: { findMany: jest.Mock }
  }
  let logout: UniauthLogoutService
  let userDeleted: UniauthUserDeletedService
  let userUpdated: UniauthUserUpdatedService

  beforeAll(async () => {
    const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519' })
    privateKey = pair.privateKey
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'EdDSA' }
    global.fetch = jest.fn(async () => Response.json({ keys: [jwk] })) as typeof fetch
  })

  afterAll(() => {
    global.fetch = realFetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = {
      account: { findFirst: jest.fn().mockResolvedValue({ userId: 'local-1' }) },
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
      university: {
        findMany: jest.fn().mockResolvedValue([{ id: 'kmutt', uniauthOrgId: 'org-1' }]),
      },
    }
    logout = new UniauthLogoutService(prisma as unknown as PrismaService)
    userDeleted = new UniauthUserDeletedService(prisma as unknown as PrismaService)
    userUpdated = new UniauthUserUpdatedService(prisma as unknown as PrismaService)
  })

  function token(
    event: string,
    claims: Record<string, unknown> = {},
    opts: { aud?: string; data?: Record<string, unknown> } = {},
  ) {
    return new SignJWT({ events: { [event]: opts.data ?? {} }, ...claims })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
      .setIssuer(issuer)
      .setAudience(opts.aud ?? clientId)
      .setSubject('ua_1')
      .setIssuedAt()
      .setExpirationTime('2m')
      .setJti('jti-1')
      .sign(privateKey)
  }

  describe('back-channel logout', () => {
    it('ends every unishare session of the user', async () => {
      await expect(logout.handle(await token(LOGOUT_EVENT))).resolves.toBe(true)
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'local-1' } })
    })

    it('with a sid, ends only the sessions from that uniauth session (and unmatched old ones)', async () => {
      await expect(logout.handle(await token(LOGOUT_EVENT, { sid: 'ua-session-1' }))).resolves.toBe(
        true,
      )
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'local-1', OR: [{ uniauthSid: 'ua-session-1' }, { uniauthSid: null }] },
      })
    })

    it('accepts but does nothing for someone who never signed in to unishare', async () => {
      prisma.account.findFirst.mockResolvedValue(null)
      await expect(logout.handle(await token(LOGOUT_EVENT))).resolves.toBe(true)
      expect(prisma.session.deleteMany).not.toHaveBeenCalled()
    })

    it('rejects a token for another client, with a nonce, or without the logout event', async () => {
      await expect(logout.handle(await token(LOGOUT_EVENT, {}, { aud: 'unigym' }))).resolves.toBe(
        false,
      )
      await expect(logout.handle(await token(LOGOUT_EVENT, { nonce: 'n' }))).resolves.toBe(false)
      await expect(logout.handle(await token(LOGOUT_EVENT, { events: {} }))).resolves.toBe(false)
      await expect(logout.handle('not-a-jwt')).resolves.toBe(false)
      expect(prisma.session.deleteMany).not.toHaveBeenCalled()
    })

    it('does not treat a deletion notice as a logout', async () => {
      await expect(logout.handle(await token(USER_DELETED_EVENT))).resolves.toBe(false)
    })
  })

  describe('account deleted in uniauth', () => {
    it("deletes the user's sessions, accounts and data", async () => {
      await expect(userDeleted.handle(await token(USER_DELETED_EVENT))).resolves.toBe(true)
      expect(prisma.account.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: 'uniauth', accountId: 'ua_1' } }),
      )
      expect(mockInternalAdapter.deleteUserSessions).toHaveBeenCalledWith('local-1')
      expect(mockInternalAdapter.deleteAccounts).toHaveBeenCalledWith('local-1')
      expect(mockInternalAdapter.deleteUser).toHaveBeenCalledWith('local-1')
    })

    it('accepts but does nothing for someone who never used unishare', async () => {
      prisma.account.findFirst.mockResolvedValue(null)
      await expect(userDeleted.handle(await token(USER_DELETED_EVENT))).resolves.toBe(true)
      expect(mockInternalAdapter.deleteUser).not.toHaveBeenCalled()
    })

    it('never deletes on a logout token, a mixed token, or one for another app', async () => {
      await expect(userDeleted.handle(await token(LOGOUT_EVENT))).resolves.toBe(false)
      await expect(
        userDeleted.handle(
          await token(USER_DELETED_EVENT, {
            events: { [USER_DELETED_EVENT]: {}, [LOGOUT_EVENT]: {} },
          }),
        ),
      ).resolves.toBe(false)
      await expect(
        userDeleted.handle(await token(USER_DELETED_EVENT, {}, { aud: 'unigym' })),
      ).resolves.toBe(false)
      await expect(
        userDeleted.handle(await token(USER_DELETED_EVENT, { nonce: 'n' })),
      ).resolves.toBe(false)
      expect(mockInternalAdapter.deleteUser).not.toHaveBeenCalled()
    })
  })

  describe('profile updated in uniauth', () => {
    const data = {
      email: 'Ada@KMUTT.ac.th',
      email_verified: true,
      name: 'Ada L.',
      picture: null,
      'urn:uniauth:organizations': [{ id: 'org-1', verified: true }],
    }

    it('refreshes name, avatar (cleared), email and university', async () => {
      await expect(userUpdated.handle(await token(USER_UPDATED_EVENT, {}, { data }))).resolves.toBe(
        true,
      )
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'local-1' },
        data: {
          name: 'Ada L.',
          image: null,
          emailVerified: true,
          universityId: 'kmutt',
          email: 'ada@kmutt.ac.th',
        },
      })
    })

    it('keeps the old email when the new one belongs to someone else', async () => {
      prisma.user.update
        .mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))
        .mockResolvedValueOnce({})
      await expect(userUpdated.handle(await token(USER_UPDATED_EVENT, {}, { data }))).resolves.toBe(
        true,
      )
      expect(prisma.user.update).toHaveBeenLastCalledWith({
        where: { id: 'local-1' },
        data: { name: 'Ada L.', image: null, emailVerified: true, universityId: 'kmutt' },
      })
    })

    it('does nothing for someone who never used unishare', async () => {
      prisma.account.findFirst.mockResolvedValue(null)
      await expect(userUpdated.handle(await token(USER_UPDATED_EVENT, {}, { data }))).resolves.toBe(
        true,
      )
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('never takes a logout or deletion token as an update', async () => {
      await expect(userUpdated.handle(await token(LOGOUT_EVENT))).resolves.toBe(false)
      await expect(userUpdated.handle(await token(USER_DELETED_EVENT))).resolves.toBe(false)
      await expect(userDeleted.handle(await token(USER_UPDATED_EVENT, {}, { data }))).resolves.toBe(
        false,
      )
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(mockInternalAdapter.deleteUser).not.toHaveBeenCalled()
    })
  })
})

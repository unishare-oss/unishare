import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose'
import { ServiceUnavailableException } from '@nestjs/common'
import type { PrismaService } from '@/prisma/prisma.service'
import { UniauthIdentityEventsService } from './uniauth-identity-events.service'
import { UniauthReconcileService, reconcileIntervalMs } from './uniauth-reconcile.service'
import { ResyncRequired, type DirectoryIdentity } from './uniauth-directory.client'

const issuer = 'http://auth.test/api/auth'
const MACHINE = 'unishare-machine'
const OLD_MACHINE = 'unishare-machine-old'

jest.mock('@/auth/uniauth-config', () => ({
  uniauthConfig: { issuer: 'http://auth.test/api/auth', clientId: 'unishare-client' },
  uniauthDirectoryConfig: () => ({
    clientId: 'unishare-machine',
    clientSecret: 's',
    audiences: ['unishare-machine', 'unishare-machine-old'],
    origin: 'http://auth.test',
  }),
}))

interface FakeUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
  identityVersion: number | null
  identityStatus: string
  universityId?: string | null
}

/** An in-memory stand-in for the few Prisma calls the services make, with real createMany/skipDuplicates semantics. */
function fakePrisma() {
  const users = new Map<string, FakeUser>()
  const accounts: { id: string; accountId: string; providerId: string; userId: string }[] = []
  const receipts = new Map<string, object>()
  let sessions: { userId: string }[] = []
  let cursor: string | null = null
  let hasCursorRow = false
  let chain: Promise<void> = Promise.resolve()
  const prisma = {
    users,
    accounts,
    receipts,
    get sessions() {
      return sessions
    },
    set sessions(next: { userId: string }[]) {
      sessions = next
    },
    get cursor() {
      return cursor
    },
    set cursor(next: string | null) {
      cursor = next
      hasCursorRow = true
    },
    account: {
      findFirst: jest.fn(
        async ({ where }: { where: { providerId: string; accountId: string } }) =>
          accounts.find(
            (a) => a.providerId === where.providerId && a.accountId === where.accountId,
          ) ?? null,
      ),
      findMany: jest.fn(
        async ({
          where,
          take,
        }: {
          where: { accountId?: { gt?: string; in?: string[] } }
          take?: number
        }) =>
          accounts
            .filter((a) => !where.accountId?.gt || a.accountId > where.accountId.gt)
            .filter((a) => !where.accountId?.in || where.accountId.in.includes(a.accountId))
            .sort((a, b) => a.accountId.localeCompare(b.accountId))
            .slice(0, take ?? 1000),
      ),
    },
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
      ),
      count: jest.fn(
        async ({ where }: { where: { email: string } }) =>
          [...users.values()].filter((u) => u.email === where.email).length,
      ),
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
          Object.assign(users.get(where.id)!, data)
        },
      ),
    },
    session: {
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        sessions = sessions.filter((s) => s.userId !== where.userId)
      }),
    },
    identityEventReceipt: {
      createMany: jest.fn(async ({ data }: { data: { eventId: string }[] }) => {
        let count = 0
        for (const row of data) {
          if (receipts.has(row.eventId)) continue
          receipts.set(row.eventId, row)
          count++
        }
        return { count }
      }),
      findUnique: jest.fn(
        async ({ where }: { where: { eventId: string } }) => receipts.get(where.eventId) ?? null,
      ),
    },
    identityReconcile: {
      findUnique: jest.fn(async () => (hasCursorRow ? { cursor } : null)),
      upsert: jest.fn(async ({ update }: { update: { cursor: string | null } }) => {
        cursor = update.cursor
        hasCursorRow = true
      }),
    },
    university: {
      findMany: jest.fn(async ({ where }: { where: { slug: { in: string[] } } }) =>
        where.slug.in.filter((s) => s === 'kmutt').map((s) => ({ id: `uni-${s}`, slug: s })),
      ),
    },
    $queryRaw: jest.fn(async () => []),
    // Transactions run one after the other, like the real row lock (SELECT ... FOR UPDATE) makes them for one user.
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => {
      const run = chain.then(() => fn(prisma))
      chain = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    }),
  }
  return prisma
}

describe('uniauth v1 identity events', () => {
  let privateKey: CryptoKey
  const realFetch = global.fetch
  let prisma: ReturnType<typeof fakePrisma>
  let directory: { read: jest.Mock; batch: jest.Mock; changes: jest.Mock; enabled: jest.Mock }
  let deleted: { deleteLocalUser: jest.Mock }
  let service: UniauthIdentityEventsService
  let reconcile: UniauthReconcileService

  beforeAll(async () => {
    const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519' })
    privateKey = pair.privateKey
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'EdDSA' }
    global.fetch = jest.fn(async () => Response.json({ keys: [jwk] })) as typeof fetch
  })
  afterAll(() => {
    global.fetch = realFetch
  })

  const addUser = (id: string, sub: string, extra: Partial<FakeUser> = {}) => {
    prisma.users.set(id, {
      id,
      email: `${id}@example.com`,
      name: id,
      emailVerified: true,
      image: null,
      identityVersion: null,
      identityStatus: 'active',
      ...extra,
    })
    prisma.accounts.push({ id: `acc-${id}`, accountId: sub, providerId: 'uniauth', userId: id })
    prisma.sessions.push({ userId: id }, { userId: id })
  }
  const profile = (sub: string, patch: Partial<DirectoryIdentity> = {}): DirectoryIdentity => ({
    id: sub,
    name: 'Renamed',
    email: `${sub}@example.com`,
    emailVerified: true,
    image: null,
    status: 'active',
    version: 2,
    ...patch,
  })

  beforeEach(() => {
    prisma = fakePrisma()
    directory = {
      read: jest.fn(),
      batch: jest.fn(),
      changes: jest.fn(),
      enabled: jest.fn().mockReturnValue(true),
    }
    deleted = {
      deleteLocalUser: jest.fn(async (sub: string) => {
        const account = prisma.accounts.find((a) => a.accountId === sub)
        if (!account) return
        prisma.users.delete(account.userId)
        prisma.accounts.splice(prisma.accounts.indexOf(account), 1)
      }),
    }
    service = new UniauthIdentityEventsService(
      prisma as unknown as PrismaService,
      directory as never,
      deleted as never,
    )
    reconcile = new UniauthReconcileService(
      prisma as unknown as PrismaService,
      directory as never,
      service,
      {} as never,
    )
  })

  function token(
    sub: string,
    event: object,
    opts: { aud?: string; claims?: Record<string, unknown> } = {},
  ) {
    return new SignJWT({
      events: {
        'urn:uniauth:event:identity': {
          schemaVersion: 1,
          issuer,
          subject: sub,
          occurredAt: '2026-10-19T08:00:00Z',
          ...event,
        },
      },
      ...opts.claims,
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
      .setIssuer(issuer)
      .setAudience(opts.aud ?? MACHINE)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey)
  }
  const event = (type: string, identityVersion: number, eventId = `e-${Math.random()}`) => ({
    eventId,
    type,
    identityVersion,
  })

  it('applies an update from the directory, ignores a duplicate and an older version, applies a newer one', async () => {
    addUser('u1', 'ua1')
    directory.read.mockResolvedValue(profile('ua1', { name: 'Second', version: 2 }))
    expect(await service.handle(await token('ua1', event('identity.updated', 2, 'a')))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({ name: 'Second', identityVersion: 2 })

    directory.read.mockResolvedValue(profile('ua1', { name: 'Changed under us' }))
    expect(await service.handle(await token('ua1', event('identity.updated', 2, 'a')))).toBe(204) // duplicate
    expect(prisma.users.get('u1')!.name).toBe('Second')
    expect(await service.handle(await token('ua1', event('identity.updated', 1, 'old')))).toBe(204) // older
    expect(prisma.users.get('u1')).toMatchObject({ name: 'Second', identityVersion: 2 })

    directory.read.mockResolvedValue(profile('ua1', { name: 'Third', version: 3 }))
    expect(await service.handle(await token('ua1', event('identity.updated', 3)))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({ name: 'Third', identityVersion: 3 })
  })

  it('suspension ends sessions and blocks; reactivation allows again; a late older suspension does nothing', async () => {
    addUser('u1', 'ua1')
    expect(await service.handle(await token('ua1', event('identity.suspended', 2)))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({
      identityStatus: 'suspended',
      identityVersion: 2,
    })
    expect(prisma.sessions).toHaveLength(0)
    expect(await service.handle(await token('ua1', event('identity.reactivated', 3)))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({ identityStatus: 'active', identityVersion: 3 })
    expect(await service.handle(await token('ua1', event('identity.suspended', 2)))).toBe(204)
    expect(prisma.users.get('u1')!.identityStatus).toBe('active')
    // The local ban and roles are Unishare's own and are never touched: only identity columns change.
    expect(Object.keys(prisma.users.get('u1')!)).not.toContain('banned')
  })

  it('deletion uses the existing deletion, and a late update cannot bring the person back', async () => {
    addUser('u1', 'ua1')
    expect(await service.handle(await token('ua1', event('identity.deleted', 4, 'del')))).toBe(204)
    expect(deleted.deleteLocalUser).toHaveBeenCalledWith('ua1')
    expect(prisma.users.has('u1')).toBe(false)
    expect(await service.handle(await token('ua1', event('identity.deleted', 4, 'del')))).toBe(204) // redelivery
    expect(deleted.deleteLocalUser).toHaveBeenCalledTimes(1)
    directory.read.mockResolvedValue(profile('ua1'))
    expect(await service.handle(await token('ua1', event('identity.updated', 3)))).toBe(204)
    expect(prisma.users.size).toBe(0)
  })

  it('verifies the token, accepts a rotation audience and the connection check, and never creates a user', async () => {
    addUser('u1', 'ua1')
    const good = await token('ua1', event('identity.suspended', 9))
    expect(
      await service.handle(
        await token('ua1', event('identity.suspended', 9), { aud: 'someone-else' }),
      ),
    ).toBe(401)
    expect(await service.handle(`${good.slice(0, -4)}AAAA`)).toBe(401)
    expect(await service.handle('not-a-token')).toBe(401)
    expect(prisma.users.get('u1')!.identityStatus).toBe('active')
    expect(
      await service.handle(await token('ua1', event('identity.updated', 1), { aud: OLD_MACHINE })),
    ).toBe(204)
    expect(
      await service.handle(
        await token('ua1', { ...event('identity.suspended', 9), schemaVersion: 2 }),
      ),
    ).toBe(400)
    const check = await new SignJWT({
      events: { 'urn:uniauth:event:connection-check': { synthetic: true } },
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
      .setIssuer(issuer)
      .setAudience(MACHINE)
      .setSubject('connection-check')
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey)
    expect(await service.handle(check)).toBe(204)
    expect(await service.handle(await token('stranger', event('identity.updated', 1)))).toBe(204) // nobody here
    expect(prisma.users.size).toBe(1)
    expect(await service.handle(await token('ua1', event('identity.future-thing', 5)))).toBe(204)
  })

  it('answers 503 (uniauth retries) when the profile cannot be fetched, without recording the event', async () => {
    addUser('u1', 'ua1')
    directory.read.mockRejectedValue(new ServiceUnavailableException())
    await expect(
      service.handle(await token('ua1', event('identity.updated', 2, 'r1'))),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(prisma.receipts.has('r1')).toBe(false)
    directory.read.mockResolvedValue(profile('ua1', { name: 'Later' }))
    expect(await service.handle(await token('ua1', event('identity.updated', 2, 'r1')))).toBe(204)
    expect(prisma.users.get('u1')!.name).toBe('Later')
  })

  it('reconciles from the change feed after being offline, then only what is new', async () => {
    addUser('a', 'uaA')
    addUser('b', 'uaB')
    directory.changes.mockResolvedValueOnce({
      changes: [
        { eventId: 'f1', type: 'identity.updated', id: 'uaA', version: 2 },
        { eventId: 'f2', type: 'identity.suspended', id: 'uaB', version: 2 },
        { eventId: 'f3', type: 'identity.updated', id: 'stranger', version: 1 },
      ],
      cursor: '3',
      hasMore: false,
    })
    directory.batch.mockResolvedValue(
      new Map([
        ['uaA', { result: 'found', identity: profile('uaA', { name: 'A offline' }) }],
        ['uaB', { result: 'found', identity: profile('uaB', { status: 'suspended' }) }],
      ]),
    )
    expect(await reconcile.reconcile()).toEqual({
      applied: 2,
      skipped: 0,
      resynced: false,
      stopped: false,
    })
    expect(prisma.users.get('a')).toMatchObject({ name: 'A offline', identityVersion: 2 })
    expect(prisma.users.get('b')).toMatchObject({ identityStatus: 'suspended' })
    expect(prisma.cursor).toBe('3')

    directory.changes.mockResolvedValueOnce({ changes: [], cursor: '3', hasMore: false })
    expect(await reconcile.reconcile()).toEqual({
      applied: 0,
      skipped: 0,
      resynced: false,
      stopped: false,
    })
    expect(directory.changes).toHaveBeenLastCalledWith('3', 100) // resumed from the saved cursor
  })

  it('resyncs every linked account with batch reads when the cursor is older than uniauth retention', async () => {
    addUser('keep', 'uaK')
    addUser('gone', 'uaG')
    addUser('susp', 'uaS')
    prisma.cursor = '7'
    directory.changes
      .mockRejectedValueOnce(new ResyncRequired())
      .mockResolvedValueOnce({ changes: [], cursor: '0', hasMore: false })
    directory.batch.mockResolvedValue(
      new Map([
        ['uaK', { result: 'found', identity: profile('uaK', { name: 'Kept', version: 9 }) }],
        ['uaG', { result: 'deleted', identity: null }],
        ['uaS', { result: 'found', identity: profile('uaS', { status: 'suspended', version: 9 }) }],
      ]),
    )
    const result = await reconcile.reconcile()
    expect(result.resynced).toBe(true)
    expect(prisma.users.get('keep')).toMatchObject({ name: 'Kept', identityVersion: 9 })
    expect(prisma.users.has('gone')).toBe(false) // the existing deletion
    expect(prisma.users.get('susp')).toMatchObject({ identityStatus: 'suspended' })
    expect(prisma.sessions.filter((s) => s.userId === 'susp')).toHaveLength(0)
    expect(prisma.cursor).toBe('0')
  })

  it('stores the directory version when it is newer than the event, and answers 503 when it is older', async () => {
    addUser('u1', 'ua1')
    directory.read.mockResolvedValue(profile('ua1', { name: 'Five', version: 5 }))
    expect(await service.handle(await token('ua1', event('identity.updated', 3)))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({ name: 'Five', identityVersion: 5 })
    directory.read.mockResolvedValue(profile('ua1', { name: 'Still five', version: 5 }))
    await expect(
      service.handle(await token('ua1', event('identity.updated', 7, 'lag'))),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(prisma.receipts.has('lag')).toBe(false)
    expect(prisma.users.get('u1')!.name).toBe('Five')
    directory.read.mockResolvedValue(profile('ua1', { name: 'Seven', version: 7 }))
    expect(await service.handle(await token('ua1', event('identity.updated', 7, 'lag')))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({ name: 'Seven', identityVersion: 7 })
  })

  it('applies two events for one person at the same moment in either order and ends at the newer', async () => {
    for (let round = 0; round < 10; round++) {
      addUser(`r${round}`, `uaR${round}`)
      const at = (version: number, name: string) => profile(`uaR${round}`, { name, version })
      const ev = (version: number) => ({
        eventId: `ev-${round}-${version}`,
        type: 'identity.updated',
        subject: `uaR${round}`,
        identityVersion: version,
      })
      const pair = [
        service.apply(ev(5), { profile: at(5, 'Five'), userId: `r${round}` }),
        service.apply(ev(6), { profile: at(6, 'Six'), userId: `r${round}` }),
      ]
      await Promise.all(round % 2 ? pair : pair.reverse())
      expect(prisma.users.get(`r${round}`)).toMatchObject({ name: 'Six', identityVersion: 6 })
    }
  })

  it('maps the directory memberships onto the university like sign-in, and leaves it alone when none maps', async () => {
    addUser('u1', 'ua1', { universityId: 'old-uni' })
    directory.read.mockResolvedValue(
      profile('ua1', {
        version: 2,
        'urn:uniauth:organizations': [{ id: 'org-kmutt', slug: 'kmutt', verified: true }],
      }),
    )
    await service.handle(await token('ua1', event('identity.updated', 2)))
    expect(prisma.users.get('u1')).toMatchObject({ universityId: 'uni-kmutt' })
    directory.read.mockResolvedValue(
      profile('ua1', {
        version: 3,
        'urn:uniauth:organizations': [{ id: 'unknown-org', slug: 'unknown', verified: true }],
      }),
    )
    await service.handle(await token('ua1', event('identity.updated', 3)))
    expect(prisma.users.get('u1')!.universityId).toBe('uni-kmutt') // nothing maps: unchanged
  })

  it('keeps the old email and applies the rest when the new email is raced onto another user', async () => {
    addUser('u1', 'ua1')
    directory.read.mockResolvedValue(
      profile('ua1', { name: 'Renamed', email: 'new@example.com', version: 2 }),
    )
    let first = true
    const real = prisma.$transaction.getMockImplementation()!
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => {
      if (first) {
        first = false
        return Promise.reject(
          Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
        )
      }
      return real(fn)
    })
    expect(await service.handle(await token('ua1', event('identity.updated', 2)))).toBe(204)
    expect(prisma.users.get('u1')).toMatchObject({
      name: 'Renamed',
      email: 'u1@example.com',
      identityVersion: 2,
    })
  })

  it('a tombstone read for an update, or a deleted batch entry, is the existing deletion', async () => {
    addUser('u1', 'ua1')
    directory.read.mockResolvedValue({ id: 'ua1', status: 'deleted', version: 4 })
    expect(await service.handle(await token('ua1', event('identity.updated', 4)))).toBe(204)
    expect(deleted.deleteLocalUser).toHaveBeenCalledWith('ua1')
    addUser('u2', 'ua2')
    directory.batch.mockResolvedValue(
      new Map([
        ['ua2', { result: 'found', identity: { id: 'ua2', status: 'deleted', version: 4 } }],
      ]),
    )
    expect(await reconcile.resync()).toBe(0)
    expect(prisma.users.has('u2')).toBe(false)
  })

  it('skips and counts a malformed entry and an unreadable profile instead of wedging the cursor; a lagging directory stops', async () => {
    addUser('good', 'uaGood')
    addUser('orphan', 'uaOrphan')
    directory.changes.mockResolvedValueOnce({
      changes: [
        { eventId: 5, type: 'identity.updated', id: 'x', version: 1 },
        { eventId: 'm1', type: 'identity.updated', id: 'uaOrphan', version: 1 },
        { eventId: 'ok1', type: 'identity.updated', id: 'uaGood', version: 2 },
      ],
      cursor: '3',
      hasMore: false,
    })
    directory.batch.mockResolvedValue(
      new Map([
        [
          'uaGood',
          { result: 'found', identity: profile('uaGood', { name: 'Good now', version: 2 }) },
        ],
        ['uaOrphan', { result: 'not_found', identity: null }],
      ]),
    )
    expect(await reconcile.reconcile()).toEqual({
      applied: 1,
      skipped: 2,
      resynced: false,
      stopped: false,
    })
    expect(prisma.users.get('good')!.name).toBe('Good now')
    expect(prisma.cursor).toBe('3') // moved past the bad entries

    directory.changes.mockResolvedValueOnce({
      changes: [{ eventId: 'ahead', type: 'identity.updated', id: 'uaGood', version: 9 }],
      cursor: '4',
      hasMore: false,
    })
    directory.batch.mockResolvedValue(
      new Map([['uaGood', { result: 'found', identity: profile('uaGood', { version: 8 }) }]]),
    )
    expect(await reconcile.reconcile()).toMatchObject({ applied: 0, stopped: true })
    expect(prisma.cursor).toBe('3') // not advanced: retried next run
    expect(directory.batch).toHaveBeenCalledTimes(2) // one batch per page, not one read per change
  })

  it('looks up who it knows with one query per page', async () => {
    addUser('a', 'uaA')
    addUser('b', 'uaB')
    directory.changes.mockResolvedValueOnce({
      changes: [
        { eventId: 'e1', type: 'identity.suspended', id: 'uaA', version: 2 },
        { eventId: 'e2', type: 'identity.suspended', id: 'uaB', version: 2 },
        { eventId: 'e3', type: 'identity.reactivated', id: 'uaA', version: 3 },
      ],
      cursor: '3',
      hasMore: false,
    })
    await reconcile.reconcile()
    expect(prisma.account.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.account.findFirst).not.toHaveBeenCalled()
    expect(directory.batch).not.toHaveBeenCalled() // only updates need profiles
  })

  describe('UNIAUTH_RECONCILE_HOURS', () => {
    it('defaults to 6 hours, takes a positive number, caps at a timer limit, and refuses nonsense', () => {
      for (const raw of [undefined, '', ' ']) expect(reconcileIntervalMs(raw)).toBe(6 * 3_600_000)
      expect(reconcileIntervalMs('0.5')).toBe(1_800_000)
      expect(reconcileIntervalMs('100000')).toBe(2 ** 31 - 1)
      for (const raw of ['0', '-1', 'abc', 'Infinity'])
        expect(() => reconcileIntervalMs(raw)).toThrow(/positive number/)
    })
  })
})

import { PrismaService } from '@/prisma/prisma.service'
import { UniauthIdentityEventsService } from './uniauth-identity-events.service'
import type { DirectoryIdentity } from './uniauth-directory.client'

// Real Postgres, real transactions and row locks. Needs a THROWAWAY database (never staging or production) holding unishare's
// tables, which does not need pgvector:
//   createdb unishare_test
//   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | sed 's/vector(768)/text/' | psql unishare_test
//   UNISHARE_TEST_DATABASE_URL=postgresql://…/unishare_test pnpm --filter api test -- uniauth-identity-events.integration
const url = process.env.UNISHARE_TEST_DATABASE_URL
const describeDb = url ? describe : describe.skip

jest.mock('@/auth/uniauth-config', () => ({
  uniauthConfig: { issuer: 'http://auth.test/api/auth', clientId: 'unishare-client' },
  uniauthDirectoryConfig: () => ({
    clientId: 'm',
    clientSecret: 's',
    audiences: ['m'],
    origin: 'http://auth.test',
  }),
}))

describeDb('uniauth identity events against a real database', () => {
  let prisma: PrismaService
  let service: UniauthIdentityEventsService
  const run = Math.random().toString(36).slice(2, 8)

  beforeAll(async () => {
    process.env.DATABASE_URL = url
    prisma = new PrismaService()
    await prisma.$connect()
    const deleted = {
      deleteLocalUser: async (sub: string) => {
        const account = await prisma.account.findFirst({
          where: { providerId: 'uniauth', accountId: sub },
        })
        if (account) await prisma.user.delete({ where: { id: account.userId } })
      },
    }
    service = new UniauthIdentityEventsService(prisma, {} as never, deleted as never)
  })
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { startsWith: `it-${run}` } } })
    await prisma.university.deleteMany({ where: { id: { startsWith: `it-${run}` } } })
    await prisma.identityEventReceipt.deleteMany({
      where: { subject: { startsWith: `ua-${run}` } },
    })
    await prisma.$disconnect()
  })

  const person = async (n: string, extra: Record<string, unknown> = {}) => {
    const id = `it-${run}-${n}`
    await prisma.user.create({ data: { id, name: n, email: `${id}@example.com`, ...extra } })
    await prisma.account.create({
      data: { id: `acc-${id}`, accountId: `ua-${run}-${n}`, providerId: 'uniauth', userId: id },
    })
    await prisma.session.create({
      data: { id: `s-${id}`, token: `t-${id}`, userId: id, expiresAt: new Date(Date.now() + 1e6) },
    })
    return { id, sub: `ua-${run}-${n}` }
  }
  const at = (sub: string, patch: Partial<DirectoryIdentity>): DirectoryIdentity => ({
    id: sub,
    name: 'N',
    email: `${sub}@example.com`,
    emailVerified: true,
    image: null,
    status: 'active',
    version: 1,
    ...patch,
  })
  const ev = (sub: string, type: string, identityVersion: number) => ({
    eventId: `${sub}-${type}-${identityVersion}-${Math.random()}`,
    type,
    subject: sub,
    identityVersion,
  })

  it('two events for one person applied at the same moment never leave the older one in place (row lock)', async () => {
    for (let round = 0; round < 15; round++) {
      const p = await person(`race${round}`)
      const pair = [
        service.apply(ev(p.sub, 'identity.updated', 5), {
          profile: at(p.sub, { name: 'Five', version: 5 }),
          userId: p.id,
        }),
        service.apply(ev(p.sub, 'identity.updated', 6), {
          profile: at(p.sub, { name: 'Six', version: 6 }),
          userId: p.id,
        }),
      ]
      await Promise.all(round % 2 ? pair : pair.reverse())
      const user = await prisma.user.findUniqueOrThrow({ where: { id: p.id } })
      expect([user.name, user.identityVersion]).toEqual(['Six', 6])
    }
  })

  it('suspension ends sessions without touching the local ban; memberships map onto the university', async () => {
    await prisma.university.create({
      data: { id: `it-${run}-uni`, name: `Uni ${run}`, shortName: 'U', slug: `it-${run}` },
    })
    const p = await person('susp', { banned: true, banReason: 'local decision' })
    await service.apply(ev(p.sub, 'identity.suspended', 2), { userId: p.id })
    let user = await prisma.user.findUniqueOrThrow({ where: { id: p.id } })
    expect([user.identityStatus, user.identityVersion, user.banned, user.banReason]).toEqual([
      'suspended',
      2,
      true,
      'local decision',
    ])
    expect(await prisma.session.count({ where: { userId: p.id } })).toBe(0)

    await service.apply(ev(p.sub, 'identity.updated', 3), {
      profile: at(p.sub, {
        version: 3,
        'urn:uniauth:organizations': [
          { id: `org-${run}`, slug: `it-${run}`, verified: true },
          { id: 'unknown', slug: `unknown-${run}`, verified: true },
        ],
      }),
      userId: p.id,
    })
    user = await prisma.user.findUniqueOrThrow({ where: { id: p.id } })
    expect([user.universityId, user.identityStatus, user.banned]).toEqual([
      `it-${run}-uni`,
      'active',
      true,
    ])
  })

  it('keeps the old email when another user holds the new one, and applies the rest', async () => {
    const a = await person('mail-a')
    const b = await person('mail-b')
    await service.apply(ev(a.sub, 'identity.updated', 2), {
      profile: at(a.sub, { name: 'A renamed', email: `${b.id}@example.com`, version: 2 }),
      userId: a.id,
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { id: a.id } })
    expect([user.name, user.email, user.identityVersion]).toEqual([
      'A renamed',
      `${a.id}@example.com`,
      2,
    ])
  })

  it('a duplicate event id changes nothing, and a tombstone is the deletion', async () => {
    const p = await person('dup')
    const event = ev(p.sub, 'identity.updated', 2)
    expect(
      await service.apply(event, {
        profile: at(p.sub, { name: 'First', version: 2 }),
        userId: p.id,
      }),
    ).toBe('applied')
    expect(
      await service.apply(event, {
        profile: at(p.sub, { name: 'Second', version: 2 }),
        userId: p.id,
      }),
    ).toBe('duplicate')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).name).toBe('First')
    expect(
      await service.apply(ev(p.sub, 'identity.updated', 3), {
        profile: { id: p.sub, status: 'deleted', version: 3 },
        userId: p.id,
      }),
    ).toBe('applied')
    expect(await prisma.user.count({ where: { id: p.id } })).toBe(0)
  })
})

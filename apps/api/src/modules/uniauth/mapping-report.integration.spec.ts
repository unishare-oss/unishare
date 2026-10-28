import { Pool } from 'pg'
import { buildMappingReport, compareWithDirectory } from '../../../scripts/uniauth-mapping-report'

// Needs a throwaway Postgres (never staging or production): UNISHARE_MAPPING_TEST_DATABASE_URL. It builds a small
// synthetic copy of the tables the report reads, so it does not need unishare's full schema or pgvector.
const url = process.env.UNISHARE_MAPPING_TEST_DATABASE_URL
const describeDb = url ? describe : describe.skip

describeDb('uniauth mapping report (synthetic data)', () => {
  const pool = new Pool({ connectionString: url })

  beforeAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS post, account, "user" CASCADE;
      CREATE TABLE "user" (id text PRIMARY KEY, email text NOT NULL, "isAnonymous" boolean DEFAULT false);
      CREATE TABLE account (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE);
      CREATE TABLE post (id text PRIMARY KEY, "authorId" text NOT NULL REFERENCES "user"(id));
    `)
  })
  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS post, account, "user" CASCADE')
    await pool.end()
  })

  const reset = () => pool.query('TRUNCATE post, account, "user" CASCADE')
  const user = (id: string, email: string, guest = false) =>
    pool.query('INSERT INTO "user" VALUES ($1, $2, $3)', [id, email, guest])
  const link = (userId: string, accountId: string) =>
    pool.query(`INSERT INTO account VALUES ($1, $2, 'uniauth', $3)`, [
      `acc-${userId}-${accountId}`,
      accountId,
      userId,
    ])

  it('a clean migration: ids preserved, guests ignored, no conflicts, and it writes nothing', async () => {
    await reset()
    await user('u1', 'a@x.com')
    await user('u2', 'b@x.com')
    await user('u3', 'c@x.com') // created later through uniauth sign-in: a different id
    await user('g1', 'g@guest.test', true)
    await link('u1', 'u1')
    await link('u2', 'u2')
    await link('u3', 'ua-other')
    await pool.query(`INSERT INTO post VALUES ('p1', 'u1')`)
    const client = await pool.connect()
    try {
      const report = await buildMappingReport(client)
      expect(report.users).toEqual({ total: 4, guests: 1, registered: 3 })
      expect(report.mapping).toMatchObject({
        idPreserved: 2,
        idDiffers: 1,
        unmapped: [],
        multipleLinks: [],
        sharedAccountIds: [],
        orphanLinks: [],
      })
      expect(report.foreignKeys).toEqual(
        expect.arrayContaining([
          { table: 'post', column: 'authorId', orphans: 0, validated: true },
          { table: 'account', column: 'userId', orphans: 0, validated: true },
        ]),
      )
      expect(report.conflicts).toEqual([])
      // Read only: nothing changed.
      expect((await pool.query('SELECT count(*)::int AS n FROM account')).rows[0].n).toBe(3)
    } finally {
      client.release()
    }
  })

  it('reports an unmapped user, a shared uniauth id, a second link, duplicate emails and an orphaned product row', async () => {
    await reset()
    await user('u1', 'a@x.com')
    await user('u2', 'A@X.com') // same email, other case
    await user('u3', 'c@x.com') // no link
    await user('u4', 'd@x.com')
    await link('u1', 'shared')
    await link('u2', 'shared') // one uniauth id, two local users
    await link('u4', 'u4')
    await link('u4', 'u4-second') // two links
    // An orphaned product row (a foreign key that was dropped or never enforced).
    await pool.query('ALTER TABLE post DROP CONSTRAINT "post_authorId_fkey"')
    await pool.query(`INSERT INTO post VALUES ('p9', 'ghost')`)
    await pool.query(
      'ALTER TABLE post ADD CONSTRAINT "post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"(id) NOT VALID',
    )
    const client = await pool.connect()
    try {
      const report = await buildMappingReport(client)
      expect(report.foreignKeys).toContainEqual({
        table: 'post',
        column: 'authorId',
        orphans: 1,
        validated: false,
      })
      expect(report.mapping.unmapped.map((u) => u.id)).toEqual(['u3'])
      expect(report.mapping.sharedAccountIds).toEqual([
        { accountId: 'shared', userIds: expect.arrayContaining(['u1', 'u2']) },
      ])
      expect(report.mapping.multipleLinks).toEqual([
        { userId: 'u4', accountIds: expect.arrayContaining(['u4', 'u4-second']) },
      ])
      expect(report.emails.duplicates).toEqual([
        { email: 'a@x.com', userIds: expect.arrayContaining(['u1', 'u2']) },
      ])
      expect(report.conflicts).toEqual(
        expect.arrayContaining([
          expect.stringContaining('no uniauth link'),
          expect.stringContaining('more than one user'),
          expect.stringContaining('more than one uniauth link'),
          expect.stringContaining('email(s) are shared'),
          expect.stringContaining('post.authorId: 1 row(s)'),
        ]),
      )

      // The directory comparison adds what only uniauth can tell: unknown, deleted and differently-addressed accounts.
      await compareWithDirectory(client, report, {
        batch: async () =>
          new Map([
            ['shared', { result: 'found', email: 'someone-else@x.com' }],
            ['u4', { result: 'deleted' }],
            ['u4-second', { result: 'not_found' }],
          ]),
      })
      expect(report.directory).toMatchObject({ notFound: ['u4-second'], deleted: ['u4'] })
      expect(report.directory!.emailMismatch.map((m) => m.accountId)).toEqual(['shared', 'shared'])
    } finally {
      client.release()
    }
  })
})

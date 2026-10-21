/**
 * Read-only dry run before unishare moves to the uniauth identity contracts: does every local user map to exactly one
 * uniauth account, are the ids preserved, are product foreign keys intact, and which conflicts need a person?
 * Writes nothing (the whole run is one READ ONLY transaction). unishare holds the `uniauth` account links, so this is
 * where the mapping report has to be produced (docs/uniauth/migration-runbook.md).
 *
 *   DATABASE_URL=postgres://…/unishare pnpm --filter api exec ts-node scripts/uniauth-mapping-report.ts [--json]
 *     [--directory]    also compare with uniauth's directory (UNIAUTH_ISSUER + UNIAUTH_DIRECTORY_CLIENT_ID/SECRET)
 *
 * Exit code 0: nothing needs a decision. 2: conflicts (listed). Links are never inferred from email.
 */
import { Pool, type PoolClient } from 'pg'

export interface MappingReport {
  users: { total: number; guests: number; registered: number }
  mapping: {
    /** Registered users whose link's uniauth id equals their local id (imported with their ids preserved). */
    idPreserved: number
    /** Registered users whose uniauth id differs from their local id (created through uniauth sign-in): normal, listed for the record. */
    idDiffers: number
    /** Registered users with no uniauth link at all: they could not sign in after the move. */
    unmapped: { id: string; email: string }[]
    /** A local user with more than one uniauth link. */
    multipleLinks: { userId: string; accountIds: string[] }[]
    /** One uniauth id linked to more than one local user: the conflict the unique constraint would refuse. */
    sharedAccountIds: { accountId: string; userIds: string[] }[]
    /** Uniauth links whose user is gone. */
    orphanLinks: { accountId: string; userId: string }[]
  }
  emails: { duplicates: { email: string; userIds: string[] }[] }
  /** For every foreign key that points at "user": rows that point at a missing user (must be 0; only possible for a NOT VALID key). */
  foreignKeys: { table: string; column: string; orphans: number; validated: boolean }[]
  directory?: {
    checked: number
    notFound: string[]
    emailMismatch: { accountId: string; local: string; uniauth: string }[]
    deleted: string[]
  }
  /** Anything that needs a person before the move. */
  conflicts: string[]
}

const q = async <T>(client: PoolClient, sql: string, params: unknown[] = []) =>
  (await client.query(sql, params)).rows as T[]

/** Builds the report with `client` inside a read-only transaction. */
export async function buildMappingReport(client: PoolClient): Promise<MappingReport> {
  await client.query('BEGIN READ ONLY')
  try {
    const [{ total, guests }] = await q<{ total: string; guests: string }>(
      client,
      `SELECT count(*)::text AS total, count(*) FILTER (WHERE "isAnonymous" IS TRUE)::text AS guests FROM "user"`,
    )
    const links = await q<{ userId: string; accountId: string }>(
      client,
      `SELECT "userId", "accountId" FROM "account" WHERE "providerId" = 'uniauth'`,
    )
    const registered = await q<{ id: string; email: string }>(
      client,
      `SELECT id, email FROM "user" WHERE "isAnonymous" IS NOT TRUE`,
    )

    const byUser = new Map<string, string[]>()
    const byAccount = new Map<string, string[]>()
    for (const l of links) {
      byUser.set(l.userId, [...(byUser.get(l.userId) ?? []), l.accountId])
      byAccount.set(l.accountId, [...(byAccount.get(l.accountId) ?? []), l.userId])
    }
    const unmapped = registered.filter((u) => !byUser.has(u.id))
    const multipleLinks = [...byUser]
      .filter(([, ids]) => ids.length > 1)
      .map(([userId, accountIds]) => ({ userId, accountIds }))
    const sharedAccountIds = [...byAccount]
      .filter(([, ids]) => new Set(ids).size > 1)
      .map(([accountId, userIds]) => ({ accountId, userIds }))
    const orphanLinks = await q<{ accountId: string; userId: string }>(
      client,
      `SELECT a."accountId", a."userId" FROM "account" a LEFT JOIN "user" u ON u.id = a."userId" WHERE a."providerId" = 'uniauth' AND u.id IS NULL`,
    )
    let idPreserved = 0
    let idDiffers = 0
    for (const u of registered) {
      const ids = byUser.get(u.id)
      if (!ids) continue
      if (ids.includes(u.id)) idPreserved++
      else idDiffers++
    }

    const duplicates = await q<{ email: string; userIds: string[] }>(
      client,
      `SELECT lower(email) AS email, array_agg(id) AS "userIds" FROM "user" GROUP BY lower(email) HAVING count(*) > 1`,
    )

    // Every foreign key that references "user"(id): count rows pointing at nobody.
    const fks = await q<{ tbl: string; col: string; validated: boolean }>(
      client,
      `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col, c.convalidated AS validated
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = '"user"'::regclass AND array_length(c.conkey, 1) = 1`,
    )
    const foreignKeys: MappingReport['foreignKeys'] = []
    for (const { tbl, col, validated } of fks) {
      const [{ n }] = await q<{ n: string }>(
        client,
        `SELECT count(*)::text AS n FROM ${tbl} t WHERE t."${col}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = t."${col}")`,
      )
      foreignKeys.push({ table: tbl.replace(/"/g, ''), column: col, orphans: Number(n), validated })
    }

    const conflicts: string[] = []
    if (unmapped.length)
      conflicts.push(`${unmapped.length} registered user(s) have no uniauth link`)
    if (multipleLinks.length)
      conflicts.push(`${multipleLinks.length} user(s) have more than one uniauth link`)
    if (sharedAccountIds.length)
      conflicts.push(`${sharedAccountIds.length} uniauth id(s) are linked to more than one user`)
    if (orphanLinks.length)
      conflicts.push(`${orphanLinks.length} uniauth link(s) point at a missing user`)
    if (duplicates.length)
      conflicts.push(
        `${duplicates.length} email(s) are shared by several users (case-insensitively)`,
      )
    for (const fk of foreignKeys)
      if (fk.orphans)
        conflicts.push(`${fk.table}.${fk.column}: ${fk.orphans} row(s) point at a missing user`)

    return {
      users: { total: Number(total), guests: Number(guests), registered: registered.length },
      mapping: { idPreserved, idDiffers, unmapped, multipleLinks, sharedAccountIds, orphanLinks },
      emails: { duplicates },
      foreignKeys,
      conflicts,
    }
  } finally {
    await client.query('ROLLBACK')
  }
}

/** Compares the linked ids with uniauth's directory (read-only batch reads with the machine credential). */
export async function compareWithDirectory(
  client: PoolClient,
  report: MappingReport,
  directory: { batch: (ids: string[]) => Promise<Map<string, { result: string; email?: string }>> },
) {
  const rows = await q<{ accountId: string; email: string }>(
    client,
    `SELECT a."accountId", u.email FROM "account" a JOIN "user" u ON u.id = a."userId" WHERE a."providerId" = 'uniauth' AND u."isAnonymous" IS NOT TRUE`,
  )
  const result: NonNullable<MappingReport['directory']> = {
    checked: rows.length,
    notFound: [],
    emailMismatch: [],
    deleted: [],
  }
  for (let i = 0; i < rows.length; i += 100) {
    const page = rows.slice(i, i + 100)
    const answers = await directory.batch(page.map((r) => r.accountId))
    for (const row of page) {
      const answer = answers.get(row.accountId)
      if (!answer || answer.result === 'not_found') result.notFound.push(row.accountId)
      else if (answer.result === 'deleted') result.deleted.push(row.accountId)
      else if (answer.email && answer.email.toLowerCase() !== row.email.toLowerCase()) {
        result.emailMismatch.push({
          accountId: row.accountId,
          local: row.email,
          uniauth: answer.email,
        })
      }
    }
  }
  report.directory = result
  if (result.notFound.length)
    report.conflicts.push(
      `${result.notFound.length} linked id(s) are unknown to uniauth for this client`,
    )
  if (result.deleted.length)
    report.conflicts.push(`${result.deleted.length} linked id(s) are deleted in uniauth`)
  if (result.emailMismatch.length)
    report.conflicts.push(
      `${result.emailMismatch.length} linked id(s) have a different email in uniauth`,
    )
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Set DATABASE_URL')
  const pool = new Pool({ connectionString: url })
  const client = await pool.connect()
  try {
    const report = await buildMappingReport(client)
    if (process.argv.includes('--directory')) {
      // The same client the API uses (machine token, timeouts, typed 503s), so a failure says what is wrong.
      // Loaded only here: it reads UNIAUTH_* settings, which a plain database report does not need.
      await import('reflect-metadata')
      const { UniauthDirectoryClient } =
        await import('../src/modules/uniauth/uniauth-directory.client')
      const directory = new UniauthDirectoryClient()
      if (!directory.enabled()) {
        throw new Error('--directory needs UNIAUTH_ISSUER and UNIAUTH_DIRECTORY_CLIENT_ID/SECRET')
      }
      await compareWithDirectory(client, report, {
        batch: async (ids) => {
          const answers = await directory.batch(ids).catch((error: unknown) => {
            throw new Error(
              `could not read uniauth's directory (see the log above): ${String(error)}`,
            )
          })
          return new Map(
            [...answers].map(([id, a]) => [id, { result: a.result, email: a.identity?.email }]),
          )
        },
      })
    }
    if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
    else {
      console.log(`users: ${report.users.registered} registered, ${report.users.guests} guests`)
      console.log(
        `links: ${report.mapping.idPreserved} keep their id, ${report.mapping.idDiffers} differ (created through uniauth)`,
      )
      console.log(
        report.conflicts.length ? `CONFLICTS:\n- ${report.conflicts.join('\n- ')}` : 'no conflicts',
      )
    }
    process.exitCode = report.conflicts.length ? 2 : 0
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

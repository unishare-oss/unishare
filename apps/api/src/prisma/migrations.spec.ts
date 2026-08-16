import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards infrastructure that lives in the database but cannot be expressed in schema.prisma.
 *
 * `prisma migrate dev` diffs the schema against the database and proposes dropping anything it
 * has no source for. The HNSW vector index is exactly that: Prisma models neither `vector(768)`
 * nor `USING hnsw`, so every `migrate dev` run regenerates a migration that drops it. One such
 * migration has already been generated locally.
 *
 * Nothing would fail loudly if it were applied — dropping the index costs no correctness, only
 * speed — so this is the only place the mistake gets caught.
 */
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'prisma', 'migrations')

/** Index name -> the migration that legitimately creates it. */
const PROTECTED_INDEXES: Record<string, string> = {
  post_chunk_embedding_idx: '20260729000000_add_post_chunk_vectors',
}

function migrationFiles(): { name: string; sql: string }[] {
  if (!existsSync(MIGRATIONS_DIR)) return []
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: join(MIGRATIONS_DIR, entry.name, 'migration.sql'),
    }))
    .filter((m) => existsSync(m.path))
    .map((m) => ({ name: m.name, sql: readFileSync(m.path, 'utf8') }))
}

describe('prisma migrations', () => {
  // If this ever returns nothing the suite below would pass vacuously, so assert the fixture.
  it('finds migration files to inspect', () => {
    expect(migrationFiles().length).toBeGreaterThan(0)
  })

  it.each(Object.keys(PROTECTED_INDEXES))(
    'no migration drops %s without recreating it',
    (indexName) => {
      const drops = new RegExp(`DROP\\s+INDEX[^;]*${indexName}`, 'i')
      const creates = new RegExp(`CREATE\\s+INDEX[^;]*${indexName}`, 'i')

      // A migration that drops AND recreates is a deliberate retune — changing the HNSW `m` or
      // `ef_construction`, say — and is allowed. A bare drop is the accident this guards: that is
      // exactly what `prisma migrate dev` emits, with no CREATE alongside it.
      const offenders = migrationFiles()
        .filter((m) => drops.test(m.sql) && !creates.test(m.sql))
        .map((m) => m.name)

      expect(offenders).toEqual([])
    },
  )

  it.each(Object.entries(PROTECTED_INDEXES))(
    '%s is still created by its migration',
    (indexName, creatingMigration) => {
      // Guards the other direction: deleting the CREATE would leave the drop-check passing
      // while the index no longer exists on a fresh database.
      const creator = migrationFiles().find((m) => m.name === creatingMigration)
      expect(creator).toBeDefined()
      expect(creator!.sql).toMatch(new RegExp(`CREATE\\s+INDEX[^;]*${indexName}`, 'i'))
    },
  )
})

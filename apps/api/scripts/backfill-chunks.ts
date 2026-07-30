import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { IngestionService } from '../src/modules/ai/ingestion/ingestion.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { IngestStatus } from '../src/generated/prisma/client'

/**
 * Re-ingests files that have no chunks yet. The cron sweep would eventually do this on
 * its own (20 files per 5 minutes); this script exists to do it immediately, with
 * progress output, and to retry FAILED files which the sweep deliberately skips.
 *
 * Pass --include-failed to also retry files that previously failed.
 */
async function main() {
  const includeFailed = process.argv.includes('--include-failed')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const prisma = app.get(PrismaService)
  const ingestion = app.get(IngestionService)

  const statuses: IngestStatus[] = includeFailed
    ? [IngestStatus.PENDING, IngestStatus.FAILED]
    : [IngestStatus.PENDING]

  const files = await prisma.file.findMany({
    where: { ingestStatus: { in: statuses } },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${files.length} file(s) to ingest`)

  let ready = 0
  let failed = 0

  for (const [index, file] of files.entries()) {
    await ingestion.ingestFile(file.id)

    const after = await prisma.file.findUnique({
      where: { id: file.id },
      select: { ingestStatus: true, ingestError: true },
    })
    const chunks = await prisma.postChunk.count({ where: { fileId: file.id } })

    if (after?.ingestStatus === IngestStatus.READY) {
      ready++
      console.log(`[${index + 1}/${files.length}] ${file.name}: ${chunks} chunks`)
    } else {
      failed++
      console.warn(
        `[${index + 1}/${files.length}] ${file.name}: ${after?.ingestStatus} — ${after?.ingestError}`,
      )
    }
  }

  console.log(`\nDone. ${ready} ready, ${failed} not ready.`)
  await app.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

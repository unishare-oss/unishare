import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { IngestionService } from '../src/modules/ai/ingestion/ingestion.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { IngestStatus } from '../src/generated/prisma/client'
import { CronLockService } from '../src/common/cron-lock.service'
import { SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS } from '../src/modules/ai/ingestion/ingestion.scheduler'

/**
 * Ingests every file whose ingestStatus is PENDING -- and, with --include-failed, FAILED too.
 * The cron sweep would eventually get to the PENDING ones on its own (SWEEP_BATCH_SIZE files
 * per 5 minutes); this script exists to do it immediately, with progress output, and to retry
 * FAILED files, which the sweep deliberately never re-picks.
 *
 * It selects on status only, never on chunk count, so a file that reached READY while
 * producing zero chunks is invisible here forever. That is reachable: ingestFile skips
 * replaceChunks when the extractor yields no text (a scanned, image-only PDF) and still marks
 * the file READY. Such files need their status reset by hand before this script can see them.
 */
async function main() {
  const includeFailed = process.argv.includes('--include-failed')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const prisma = app.get(PrismaService)
  const ingestion = app.get(IngestionService)
  const cronLock = app.get(CronLockService)

  // AppModule boots ScheduleModule.forRoot(), so IngestionScheduler.sweep -- @Cron every five
  // minutes -- fires inside THIS process. Any backfill lasting longer than five minutes would
  // otherwise have its own in-process sweep selecting the same PENDING rows as the loop below;
  // the transaction and @@unique([fileId, chunkIndex]) keep that from corrupting anything, but
  // the loser lands in FAILED, which is the exact status this script exists to clear.
  //
  // Holding the sweep lock says precisely the right thing -- a backfill is running, nothing
  // else should sweep -- and it excludes the other pods' schedulers too, which an in-process
  // flag could not. Note CronLockService.acquire fails OPEN if Redis is unreachable, so with
  // Redis down this degrades to the unprotected behaviour rather than refusing to run.
  const acquired = await cronLock.acquire(SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS)
  if (!acquired) {
    console.error('Another sweep or backfill holds the ingestion lock; try again shortly.')
    await app.close()
    process.exit(1)
  }

  const statuses: IngestStatus[] = includeFailed
    ? [IngestStatus.PENDING, IngestStatus.FAILED]
    : [IngestStatus.PENDING]

  let ready = 0
  let failed = 0

  try {
    const files = await prisma.file.findMany({
      where: { ingestStatus: { in: statuses } },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`Found ${files.length} file(s) to ingest`)

    for (const [index, file] of files.entries()) {
      await ingestion.ingestFile(file.id)

      // Renew after every file, exactly as the scheduler does, so the lease only has to
      // outlast one file rather than the whole run (see SWEEP_LOCK_TTL_MS). Best-effort: a
      // failed renewal risks a sweep joining in, whereas throwing would abandon the rest.
      await cronLock
        .renew(SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS)
        .catch((err: Error) => console.warn(`Lock renewal failed: ${err.message}`))

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
  } finally {
    // Every exit path, including a throw: a lock left behind blocks every sweep in every pod
    // for a full SWEEP_LOCK_TTL_MS, which is worse than having taken no lock at all.
    await cronLock.release(SWEEP_LOCK_KEY)
  }

  console.log(`\nDone. ${ready} ready, ${failed} not ready.`)
  await app.close()

  // Explicit exit. app.close() runs onModuleDestroy hooks, but AppModule still holds handles
  // that keep the event loop alive -- the CacheModule's KeyvRedis connection plus the ioredis
  // clients in RedisThrottlerStorageService and CronLockService. Without this the script
  // prints "Done." and then hangs indefinitely (observed: still alive after 2m20s).
  //
  // Non-zero when any file did not reach READY: the whole point of exiting explicitly is to be
  // usable unattended, and a run that reports "3 not ready" while exiting 0 tells CI nothing.
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

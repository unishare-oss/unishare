import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { AuditService } from './audit.service'

/** Cross-pod lock TTL. One indexed `deleteMany`, far below the daily cadence. */
const PRUNE_LOCK_TTL_MS = 5 * 60 * 1000

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name)

  constructor(
    private readonly audit: AuditService,
    private readonly cronLock: CronLockService,
  ) {}

  @Cron('0 25 0 * * *') // 00:25 daily, after the other prune jobs
  async pruneOldAuditLogs() {
    await runWithCronLock(
      this.cronLock,
      'prune-audit-logs',
      PRUNE_LOCK_TTL_MS,
      this.logger,
      async () => {
        const count = await this.audit.pruneOld()
        if (count > 0) this.logger.log(`Pruned ${count} audit log entries`)
      },
    )
  }
}

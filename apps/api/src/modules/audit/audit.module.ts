import { Global, Module } from '@nestjs/common'
import { CronLockModule } from '@/common/cron-lock.module'
import { AuditController } from './audit.controller'
import { AuditRetentionService } from './audit-retention.service'
import { AuditService } from './audit.service'

/** Global so any feature module can inject `AuditService` without importing this. */
@Global()
@Module({
  imports: [CronLockModule],
  controllers: [AuditController],
  providers: [AuditService, AuditRetentionService],
  exports: [AuditService],
})
export class AuditModule {}

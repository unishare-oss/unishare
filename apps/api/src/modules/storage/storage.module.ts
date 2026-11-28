import { Global, Module } from '@nestjs/common'
import { CollabModule } from '@/modules/collab/collab.module'
import { CronLockModule } from '@/common/cron-lock.module'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'
import { PendingUploadsService } from './pending-uploads.service'
import { PendingUploadsRepository } from './pending-uploads.repository'

@Global()
@Module({
  imports: [CollabModule, CronLockModule],
  controllers: [StorageController],
  providers: [StorageService, PendingUploadsService, PendingUploadsRepository],
  exports: [StorageService, PendingUploadsService],
})
export class StorageModule {}

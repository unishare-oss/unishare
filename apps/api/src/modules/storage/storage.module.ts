import { Global, Module } from '@nestjs/common'
import { CollabModule } from '@/modules/collab/collab.module'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'

@Global()
@Module({
  imports: [CollabModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

import { Module } from '@nestjs/common'
import { CollabController } from './collab.controller'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'

@Module({
  controllers: [CollabController],
  providers: [CollabService, CollabRepository],
  exports: [CollabService],
})
export class CollabModule {}

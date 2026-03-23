import { Module } from '@nestjs/common'
import { CollabController } from './collab.controller'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'
import { CollabGateway } from './collab.gateway'
import { CollabRoomService } from './collab.room.service'

@Module({
  controllers: [CollabController],
  providers: [CollabService, CollabRepository, CollabGateway, CollabRoomService],
  exports: [CollabService, CollabGateway],
})
export class CollabModule {}

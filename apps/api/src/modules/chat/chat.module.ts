import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatRepository } from './chat.repository'
import { ChatGateway } from './chat.gateway'
import { ChatCleanupService } from './chat-cleanup.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatGateway, ChatCleanupService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}

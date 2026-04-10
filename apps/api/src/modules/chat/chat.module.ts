import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatRepository } from './chat.repository'
import { ChatGateway } from './chat.gateway'
import { ChatCleanupService } from './chat-cleanup.service'
import { PresenceService } from './presence.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule, ConfigModule],
  controllers: [ChatController],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
      inject: [ConfigService],
    },
    ChatService,
    ChatRepository,
    ChatGateway,
    ChatCleanupService,
    PresenceService,
  ],
  exports: [ChatService, ChatGateway, PresenceService],
})
export class ChatModule {}

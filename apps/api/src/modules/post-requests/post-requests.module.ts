import { Module } from '@nestjs/common'
import { PostRequestsController } from './post-requests.controller'
import { PostRequestsRepository } from './post-requests.repository'
import { PostRequestsService } from './post-requests.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [PostRequestsController],
  providers: [PostRequestsService, PostRequestsRepository],
})
export class PostRequestsModule {}

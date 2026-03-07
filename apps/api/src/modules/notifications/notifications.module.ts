import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsRepository } from './notifications.repository'
import { NotificationsService } from './notifications.service'

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}

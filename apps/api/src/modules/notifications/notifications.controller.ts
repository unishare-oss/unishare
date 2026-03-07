import { Controller, Delete, Get, MessageEvent, Param, Patch, Sse } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { Observable } from 'rxjs'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { NotificationsService } from './notifications.service'
import { NotificationEntity } from './entities/notification.entity'

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  stream(@Session() session: UserSession): Observable<MessageEvent> {
    return this.notificationsService.streamForUser(session.user.id)
  }

  @Get()
  @ApiOkResponse({ type: [NotificationEntity] })
  @ResponseMessage('Notifications fetched successfully')
  findAll(@Session() session: UserSession) {
    return this.notificationsService.findByUser(session.user.id)
  }

  @Patch('read-all')
  @ResponseMessage('Notifications marked as read')
  async markAllRead(@Session() session: UserSession) {
    await this.notificationsService.markAllRead(session.user.id)
  }

  @Delete(':id')
  @ResponseMessage('Notification deleted')
  async deleteOne(@Session() session: UserSession, @Param('id') id: string) {
    await this.notificationsService.deleteOne(id, session.user.id)
  }

  @Delete()
  @ResponseMessage('Notifications cleared')
  async deleteAll(@Session() session: UserSession) {
    await this.notificationsService.deleteAll(session.user.id)
  }
}

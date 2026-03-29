import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags, ApiOkResponse } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { ChatService } from './chat.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { ListMessagesQueryDto } from './dto/list-messages-query.dto'
import { ChatRoomEntity } from './entities/chat-room.entity'
import { ChatMessageEntity, PaginatedMessagesEntity } from './entities/chat-message.entity'

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @ApiOkResponse({ type: [ChatRoomEntity] })
  @ResponseMessage('Chat rooms fetched successfully')
  getRooms(@Session() session: UserSession) {
    return this.chatService.getRooms(session.user.id)
  }

  @Get('rooms/dm/:userId')
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('DM room fetched successfully')
  getOrCreateDmRoom(@Param('userId') userId: string, @Session() session: UserSession) {
    return this.chatService.getOrCreateDmRoom(session.user.id, userId)
  }

  @Get('rooms/:id')
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Chat room fetched successfully')
  getRoom(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.getRoom(id, session.user.id)
  }

  @Get('rooms/:id/messages')
  @ApiOkResponse({ type: PaginatedMessagesEntity })
  @ResponseMessage('Chat messages fetched successfully')
  getMessages(
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
    @Session() session: UserSession,
  ) {
    return this.chatService.getMessages(id, session.user.id, query)
  }

  @Post('rooms')
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Chat room created successfully')
  createRoom(@Session() session: UserSession, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(session.user.id, dto.participantIds, dto.type, dto.name)
  }

  @Post('rooms/:id/messages')
  @ApiOkResponse({ type: ChatMessageEntity })
  @ResponseMessage('Message sent successfully')
  sendMessage(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, session.user.id, dto)
  }

  @Post('rooms/:id/read')
  @ResponseMessage('Room marked as read successfully')
  markAsRead(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.markAsRead(id, session.user.id)
  }
}

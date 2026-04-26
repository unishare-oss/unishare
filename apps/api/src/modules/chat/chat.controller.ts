import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserThrottlerGuard } from '@/common/guards/user-throttler.guard'
import { ChatService } from './chat.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { InviteMembersDto } from './dto/invite-members.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { UpdateChatRoomDto } from './dto/update-chat-room.dto'
import { ListMessagesQueryDto } from './dto/list-messages-query.dto'
import { UpgradeEncryptionDto } from './dto/upgrade-encryption.dto'
import { DeleteMessageResponseDto } from './dto/delete-message-response.dto'
import { LinkPreviewResponseDto } from './dto/link-preview-response.dto'
import { ChatRoomEntity } from './entities/chat-room.entity'
import { ChatMessageEntity, PaginatedMessagesEntity } from './entities/chat-message.entity'
import { ChatMemberGuard } from './guards/chat-member.guard'

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

  @Get('rooms/:id')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Chat room fetched successfully')
  getRoom(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.getRoom(id, session.user.id)
  }

  @Get('rooms/:id/messages')
  @UseGuards(ChatMemberGuard)
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
    return this.chatService.createRoom(
      session.user.id,
      dto.participantIds,
      dto.type,
      dto.name,
      dto.imageUrl,
      dto.encryptedRoomKeys,
    )
  }

  @Post('rooms/:id/messages')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: ChatMessageEntity })
  @ResponseMessage('Message sent successfully')
  sendMessage(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, session.user.id, dto)
  }

  @Patch('messages/:id')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: ChatMessageEntity })
  @ResponseMessage('Message updated successfully')
  editMessage(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.chatService.editMessage(id, session.user.id, dto)
  }

  @Delete('messages/:id')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: DeleteMessageResponseDto })
  @ResponseMessage('Message deleted successfully')
  deleteMessage(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.deleteMessage(id, session.user.id)
  }

  @Post('rooms/:id/read')
  @UseGuards(ChatMemberGuard)
  @ResponseMessage('Room marked as read successfully')
  markAsRead(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.markAsRead(id, session.user.id)
  }

  @Post('rooms/:id/upgrade-encryption')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Room encryption upgraded successfully')
  upgradeEncryption(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: UpgradeEncryptionDto,
  ) {
    return this.chatService.upgradeEncryption(id, session.user.id, dto.encryptedRoomKeys)
  }

  @Delete('rooms/:id/leave')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({
    description: 'Left the room. roomDeleted indicates if the room was also deleted.',
  })
  @ResponseMessage('Left the chat room successfully')
  leaveRoom(@Param('id') id: string, @Session() session: UserSession) {
    return this.chatService.leaveRoom(id, session.user.id)
  }

  @Get('link-preview')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOkResponse({ type: LinkPreviewResponseDto, description: 'Link preview metadata' })
  @ResponseMessage('Link preview fetched successfully')
  getLinkPreview(@Query('url') url: string, @Session() _session: UserSession) {
    return this.chatService.getLinkPreview(url)
  }

  @Patch('rooms/:id')
  @UseGuards(ChatMemberGuard)
  @ApiOperation({ summary: 'Update group room name/image' })
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Room updated successfully')
  updateRoom(
    @Param('id') id: string,
    @Body() dto: UpdateChatRoomDto,
    @Session() session: UserSession,
  ) {
    return this.chatService.updateRoom(id, session.user.id, dto)
  }

  @Delete('rooms/:id/participants/:userId')
  @UseGuards(ChatMemberGuard)
  @ApiOperation({ summary: 'Remove a member from group' })
  @ApiOkResponse({ description: 'Member removed' })
  @ResponseMessage('Member removed successfully')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Session() session: UserSession,
  ) {
    return this.chatService.removeMember(id, session.user.id, userId)
  }

  @Post('rooms/:id/participants')
  @UseGuards(ChatMemberGuard)
  @ApiOkResponse({ type: ChatRoomEntity })
  @ResponseMessage('Members invited successfully')
  inviteMembers(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Body() dto: InviteMembersDto,
  ) {
    return this.chatService.inviteMembers(id, session.user.id, dto.userIds, dto.encryptedRoomKeys)
  }
}

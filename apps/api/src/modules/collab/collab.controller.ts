import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { CollabService } from './collab.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { RoomEntity } from './entities/room.entity'

@ApiTags('collab')
@Controller('rooms')
export class CollabController {
  constructor(private readonly collabService: CollabService) {}

  @Post()
  @ApiCreatedResponse({ type: RoomEntity })
  @ResponseMessage('Room created successfully')
  create(@Body() dto: CreateRoomDto, @Session() session: UserSession) {
    return this.collabService.createRoom(dto, session.user.id)
  }

  @Get(':slug')
  @ApiOkResponse({ type: RoomEntity })
  @ResponseMessage('Room fetched successfully')
  findBySlug(@Param('slug') slug: string) {
    return this.collabService.getRoomBySlug(slug)
  }
}

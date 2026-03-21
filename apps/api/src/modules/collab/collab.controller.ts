import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import type { Request, Response } from 'express'
import { CollabService } from './collab.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { RoomEntity } from './entities/room.entity'
import { JoinRoomResponseDto } from './dto/join-room-response.dto'

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

  @Get()
  @ApiOkResponse({ type: [RoomEntity] })
  @ResponseMessage('Rooms fetched successfully')
  findByOwner(@Session() session: UserSession) {
    return this.collabService.getRoomsByOwner(session.user.id)
  }

  @Delete(':slug')
  @HttpCode(204)
  @ResponseMessage('Room deleted')
  async deleteRoom(@Param('slug') slug: string, @Session() session: UserSession) {
    await this.collabService.deleteRoom(slug, session.user.id)
  }

  @Get(':slug')
  @ApiOkResponse({ type: RoomEntity })
  @ResponseMessage('Room fetched successfully')
  findBySlug(@Param('slug') slug: string) {
    return this.collabService.getRoomBySlug(slug)
  }

  @Patch(':slug')
  @ApiOkResponse({ type: RoomEntity })
  @ResponseMessage('Room updated')
  updateRoom(
    @Param('slug') slug: string,
    @Body() dto: UpdateRoomDto,
    @Session() session: UserSession,
  ) {
    return this.collabService.updateRoom(slug, dto, session.user.id)
  }

  @Post(':slug/join')
  @OptionalAuth()
  @ApiCreatedResponse({ type: JoinRoomResponseDto })
  @ResponseMessage('Room joined successfully')
  async joinRoom(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Session() session: UserSession | null,
  ) {
    return this.collabService.joinRoom(slug, session, req, res)
  }
}

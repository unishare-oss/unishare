import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { DecksService } from './decks.service'
import { CreateDeckDto, ListDecksDto } from './dto'
import {
  DeckDownloadEntity,
  DeckEntity,
  DeckQuotaEntity,
  PaginatedDecksEntity,
} from './entities/deck.entity'

@ApiTags('decks')
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  // Static routes BEFORE parameterized routes

  @Get()
  @ApiOkResponse({ type: PaginatedDecksEntity })
  @ResponseMessage('Decks fetched successfully')
  listDecks(@Query() query: ListDecksDto, @Session() session: UserSession) {
    return this.decksService.listDecks(session.user.id, query)
  }

  @Get('quota')
  @ApiOkResponse({ type: DeckQuotaEntity })
  @ResponseMessage('Quota fetched successfully')
  getQuota(@Session() session: UserSession) {
    return this.decksService.getQuota(session.user.id)
  }

  @Post()
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Deck queued successfully')
  createDeck(@Body() dto: CreateDeckDto, @Session() session: UserSession) {
    return this.decksService.createDeck(session.user.id, dto)
  }

  @Get(':id')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Deck fetched successfully')
  getDeck(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.getDeck(id, session.user.id)
  }

  @Get(':id/download')
  @ApiOkResponse({ type: DeckDownloadEntity })
  @ResponseMessage('Download URL generated successfully')
  getDownloadUrl(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.getDownloadUrl(id, session.user.id)
  }
}

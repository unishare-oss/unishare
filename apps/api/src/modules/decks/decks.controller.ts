import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { DecksService } from './decks.service'
import { AiEditSlideDto, CreateDeckDto, ListDecksDto, UpdateSlideDto } from './dto'
import {
  DeckDownloadEntity,
  DeckEntity,
  DeckQuotaEntity,
  DeckSlideEntity,
  DeckTemplateEntity,
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

  @Get('templates')
  @ApiOkResponse({ type: [DeckTemplateEntity] })
  @ResponseMessage('Templates fetched successfully')
  listTemplates() {
    return this.decksService.listTemplates()
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
  @ApiQuery({ name: 'format', required: false, enum: ['pptx', 'pdf'] })
  @ResponseMessage('Download URL generated successfully')
  getDownloadUrl(
    @Param('id') id: string,
    @Session() session: UserSession,
    @Query('format') format?: 'pptx' | 'pdf',
  ) {
    return this.decksService.getDownloadUrl(id, session.user.id, format === 'pdf' ? 'pdf' : 'pptx')
  }

  @Get(':id/slides')
  @ApiOkResponse({ type: [DeckSlideEntity] })
  @ResponseMessage('Slides fetched successfully')
  getSlides(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.getSlides(id, session.user.id)
  }

  @Patch(':id/slides/:slideId')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Slide updated successfully')
  async updateSlide(
    @Param('id') id: string,
    @Param('slideId') slideId: string,
    @Body() dto: UpdateSlideDto,
    @Session() session: UserSession,
  ) {
    await this.decksService.updateSlide(id, session.user.id, slideId, dto.content)
    return this.decksService.getDeck(id, session.user.id)
  }

  @Post(':id/slides/:slideId/ai-edit')
  @ApiOkResponse({ type: [DeckSlideEntity] })
  @ResponseMessage('Slide edited successfully')
  async aiEditSlide(
    @Param('id') id: string,
    @Param('slideId') slideId: string,
    @Body() dto: AiEditSlideDto,
    @Session() session: UserSession,
  ) {
    await this.decksService.aiEditSlide(id, session.user.id, slideId, dto.prompt)
    // Returns the whole deck's slides: an AI edit can restructure the slide, so the client
    // cannot patch its local copy from the request it sent.
    return this.decksService.getSlides(id, session.user.id)
  }

  @Post(':id/reexport')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Re-render queued successfully')
  reexport(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.requestReexport(id, session.user.id)
  }
}

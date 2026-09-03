import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import type { Response } from 'express'
import { ApiExcludeEndpoint, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { DecksService } from './decks.service'
import { CreateDeckDto, ListDecksDto, UpdateDeckDto } from './dto'
import {
  DeckDownloadEntity,
  DeckEntity,
  DeckQuotaEntity,
  DeckTemplateEntity,
  PaginatedDecksEntity,
  DeckShareEntity,
  DeckShareRevokedEntity,
  SharedDeckEntity,
} from './entities/deck.entity'
import { DecksFrameAuthService } from './decks.frame-auth.service'

@ApiTags('decks')
@Controller('decks')
export class DecksController {
  constructor(
    private readonly decksService: DecksService,
    private readonly frameAuth: DecksFrameAuthService,
  ) {}

  /**
   * Traefik's forwardAuth target for the embedded editor's hostname.
   *
   * Not part of the public API and deliberately absent from the OpenAPI document: the only
   * caller is the ingress, and generating a client hook for it would invite someone to call it
   * from the browser, where the returned cookie must never be exposed.
   *
   * A non-2xx makes Traefik refuse the request. On success the `Cookie` header replaces the
   * one the browser sent, which is how the student's generator session is attached upstream
   * without the browser ever holding it — see the middleware in the k8s repo.
   */
  @Get('frame-auth')
  @OptionalAuth()
  @ApiExcludeEndpoint()
  @Header('Cache-Control', 'no-store')
  async frameAuthorize(
    @Session() session: UserSession | null,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-forwarded-uri') forwardedUri?: string,
  ): Promise<{ ok: true }> {
    const userId = session?.user?.id
    // 401 rather than a redirect: the caller is a proxy, and a redirect body inside the frame
    // would render the generator's own login page.
    if (!userId) throw new UnauthorizedException('Sign in to open the deck editor')

    res.setHeader(
      'Cookie',
      await this.frameAuth.authorize(userId, forwardedUri ?? '/', session.user.role as UserRole),
    )
    return { ok: true }
  }

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
    return this.decksService.getQuota(session.user.id, session.user.role as UserRole)
  }

  /**
   * A shared deck, for a caller who may not be signed in.
   *
   * OptionalAuth because the share token IS the credential — requiring an account would defeat
   * the point of sending a link to someone outside the university. Registered above the
   * parameterized routes so `shared` is never read as a deck id.
   */
  @Get('shared/:token')
  @OptionalAuth()
  @ApiOkResponse({ type: SharedDeckEntity })
  @ResponseMessage('Shared deck fetched successfully')
  getSharedDeck(@Param('token') token: string) {
    return this.decksService.getSharedDeck(token)
  }

  @Get('shared/:token/download')
  @OptionalAuth()
  @ApiOkResponse({ type: DeckDownloadEntity })
  @ApiQuery({ name: 'format', required: false, enum: ['pptx', 'pdf'] })
  @ResponseMessage('Download URL generated successfully')
  getSharedDownloadUrl(@Param('token') token: string, @Query('format') format?: 'pptx' | 'pdf') {
    return this.decksService.getSharedDownloadUrl(token, format === 'pdf' ? 'pdf' : 'pptx')
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
    return this.decksService.createDeck(session.user.id, dto, session.user.role as UserRole)
  }

  @Get(':id')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Deck fetched successfully')
  getDeck(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.getDeck(id, session.user.id)
  }

  @Patch(':id')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Deck updated successfully')
  updateDeck(@Param('id') id: string, @Body() dto: UpdateDeckDto, @Session() session: UserSession) {
    return this.decksService.updateDeck(id, session.user.id, dto)
  }

  @Delete(':id')
  @ResponseMessage('Deck deleted successfully')
  deleteDeck(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.deleteDeck(id, session.user.id)
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

  @Post(':id/share')
  @ApiOkResponse({ type: DeckShareEntity })
  @ResponseMessage('Share link created successfully')
  createShareLink(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.createShareLink(id, session.user.id)
  }

  @Delete(':id/share')
  @ApiOkResponse({ type: DeckShareRevokedEntity })
  @ResponseMessage('Share link revoked successfully')
  revokeShareLink(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.revokeShareLink(id, session.user.id)
  }

  @Post(':id/reexport')
  @ApiOkResponse({ type: DeckEntity })
  @ResponseMessage('Re-render queued successfully')
  reexport(@Param('id') id: string, @Session() session: UserSession) {
    return this.decksService.requestReexport(id, session.user.id)
  }
}

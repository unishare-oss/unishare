import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiExcludeController, ApiOkResponse } from '@nestjs/swagger'
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@/auth/auth.config'
import { BackchannelLogoutDto } from './dto/backchannel-logout.dto'
import { UniauthEventDto } from './dto/uniauth-event.dto'
import { UniauthLogoutService } from './uniauth-logout.service'
import { UniauthUserDeletedService } from './uniauth-user-deleted.service'
import { UniauthUserUpdatedService } from './uniauth-user-updated.service'
import { UniauthThemeService } from './uniauth-theme.service'
import { ThemePreferenceDto, ThemePreferenceEntity } from './dto/theme-preference.dto'

@ApiExcludeController()
@Controller('uniauth')
export class UniauthController {
  constructor(
    private readonly logout: UniauthLogoutService,
    private readonly userDeleted: UniauthUserDeletedService,
    private readonly userUpdated: UniauthUserUpdatedService,
    private readonly themes: UniauthThemeService,
  ) {}

  @Get('theme')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ThemePreferenceEntity })
  getTheme(@Session() session: UserSession) {
    if (session.user.isAnonymous) throw new UnauthorizedException()
    return this.themes.exchange(session.user.id)
  }

  @Post('theme')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ThemePreferenceEntity })
  setTheme(
    @Session() session: UserSession,
    @Body() body: ThemePreferenceDto,
    @Headers('origin') origin?: string,
  ) {
    const origins = ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean)
    if (!origin || !origins.includes(origin)) throw new ForbiddenException()
    if (session.user.isAnonymous) throw new UnauthorizedException()
    return this.themes.exchange(session.user.id, body.theme)
  }

  /** Called by uniauth (server-to-server) when the user signs out there. */
  @Post('backchannel-logout')
  @AllowAnonymous()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async backchannelLogout(@Body() dto: BackchannelLogoutDto) {
    if (!(await this.logout.handle(dto.logout_token))) {
      throw new BadRequestException('invalid logout_token')
    }
    return null
  }

  /** Called by uniauth (server-to-server) when the user deletes their uniauth account. */
  @Post('user-deleted')
  @AllowAnonymous()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async userDeletedNotice(@Body() dto: UniauthEventDto) {
    if (!(await this.userDeleted.handle(dto.token))) {
      throw new BadRequestException('invalid token')
    }
    return null
  }

  /** Called by uniauth (server-to-server) when the user's profile or universities change. */
  @Post('user-updated')
  @AllowAnonymous()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async userUpdatedNotice(@Body() dto: UniauthEventDto) {
    if (!(await this.userUpdated.handle(dto.token))) {
      throw new BadRequestException('invalid token')
    }
    return null
  }
}

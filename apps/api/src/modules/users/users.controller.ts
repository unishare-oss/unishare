import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@thallesp/nestjs-better-auth'
import type { Request } from 'express'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { auth } from '@/auth/auth.config'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { SetPasswordDto } from './dto/set-password.dto'
import { UserProfileEntity } from './entities/user-profile.entity'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id)
  }

  @Get('me/export')
  @ResponseMessage('Data exported successfully')
  exportMyData(@Session() session: UserSession) {
    return this.usersService.exportData(session.user.id)
  }

  @Post('me/set-password')
  @ResponseMessage('Password set successfully')
  async setPassword(@Req() req: Request, @Body() dto: SetPasswordDto) {
    const result = await auth.api.setPassword({
      body: { newPassword: dto.newPassword },
      headers: new Headers(req.headers as Record<string, string>),
    })
    if (!result?.status) throw new BadRequestException('Failed to set password')
    return null
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getById(@Param('id') id: string, @Session() session: UserSession) {
    return this.usersService.findById(id, session?.user?.id)
  }

  @Patch('me')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile updated successfully')
  updateMe(@Session() session: UserSession, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(session.user.id, dto)
  }

  @Patch('me/academic-profile')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Academic profile updated successfully')
  updateAcademicProfile(@Session() session: UserSession, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(session.user.id, dto)
  }
}

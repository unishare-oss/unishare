import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@thallesp/nestjs-better-auth'
import type { Request } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { auth } from '@/auth/auth.config'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { SetPasswordDto } from './dto/set-password.dto'
import { UpdatePublicKeyDto } from './dto/update-public-key.dto'
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
  async setPassword(
    @Session() session: UserSession,
    @Req() req: Request,
    @Body() dto: SetPasswordDto,
  ) {
    void session
    const result = await auth.api.setPassword({
      body: { newPassword: dto.newPassword },
      headers: fromNodeHeaders(req.headers),
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

  @Patch('me/public-key')
  @ResponseMessage('Public key updated successfully')
  updatePublicKey(@Session() session: UserSession, @Body() dto: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(session.user.id, dto.publicKey)
  }

  @Delete('me/public-key')
  @ApiOkResponse({ description: 'Encryption keys cleared' })
  @ResponseMessage('Encryption keys cleared successfully')
  clearMyKeys(@Session() session: UserSession) {
    return this.usersService.clearMyKeys(session.user.id)
  }

  @Delete('admin/public-keys')
  @Roles(['ADMIN'])
  @ResponseMessage('All public keys cleared successfully')
  clearAllPublicKeys() {
    return this.usersService.clearAllPublicKeys()
  }
}

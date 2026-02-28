import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session, UserSession } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { FilesService } from './files.service'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'
import { DownloadUrlEntity } from './entities/download-url.entity'

@ApiTags('files')
@Controller('posts/:postId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':fileId/url')
  @OptionalAuth()
  @ApiOkResponse({ type: DownloadUrlEntity })
  @ResponseMessage('Download URL generated')
  getDownloadUrl(@Param('postId') postId: string, @Param('fileId') fileId: string) {
    return this.filesService.getDownloadUrl(postId, fileId)
  }

  @Post()
  @ResponseMessage('File confirmed successfully')
  confirmUpload(
    @Param('postId') postId: string,
    @Body() dto: ConfirmFileUploadDto,
    @Session() session: UserSession,
  ) {
    return this.filesService.confirmUpload(postId, dto, session.user.id)
  }

  @Delete(':fileId')
  @ResponseMessage('File deleted successfully')
  remove(
    @Param('postId') postId: string,
    @Param('fileId') fileId: string,
    @Session() session: UserSession,
  ) {
    return this.filesService.remove(postId, fileId, session.user.id, session.user.role as UserRole)
  }
}

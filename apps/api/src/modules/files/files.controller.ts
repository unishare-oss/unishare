import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { UniversityScopeParam } from '@/common/decorators/university-scope.decorator'
import type { UniversityScope } from '@/common/university-scope'
import { FilesService } from './files.service'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'
import { DownloadUrlEntity } from './entities/download-url.entity'
import { FileEntity } from './entities/file.entity'

@ApiTags('files')
@GuestReadOnly()
@Controller('posts/:postId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':fileId/url')
  @ApiOkResponse({ type: DownloadUrlEntity })
  @ResponseMessage('Download URL generated')
  getDownloadUrl(
    @Param('postId') postId: string,
    @Param('fileId') fileId: string,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.filesService.getDownloadUrl(postId, fileId, scope)
  }

  @Post(':fileId/download')
  @ResponseMessage('Download recorded')
  recordDownload(
    @Param('postId') postId: string,
    @Param('fileId') fileId: string,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.filesService.recordDownload(postId, fileId, scope)
  }

  @Post()
  @ApiOkResponse({ type: FileEntity })
  @ResponseMessage('File confirmed successfully')
  confirmUpload(
    @Param('postId') postId: string,
    @Body() dto: ConfirmFileUploadDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.filesService.confirmUpload(postId, dto, session.user.id, scope)
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

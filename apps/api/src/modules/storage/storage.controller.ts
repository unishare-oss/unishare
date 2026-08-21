import { Body, Controller, Delete, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { CollabService } from '@/modules/collab/collab.service'
import { StorageService } from './storage.service'
import { getFolderForPurpose, PresignedUploadDto } from './dto/presigned-upload.dto'
import { PresignedUploadEntity } from './entities/presigned-upload.entity'
import { MultipartUploadEntity, UploadedPartEntity } from './entities/multipart.entity'
import {
  AbortMultipartUploadDto,
  CompleteMultipartUploadDto,
  CreateMultipartUploadDto,
  UploadPartDto,
} from './dto/multipart.dto'

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly collabService: CollabService,
  ) {}

  @Post('presigned-upload')
  @ResponseMessage('Presigned upload URL generated')
  @ApiOkResponse({ type: PresignedUploadEntity })
  async getPresignedUploadUrl(@Body() dto: PresignedUploadDto, @Session() session: UserSession) {
    if (dto.purpose === 'board-attachment') {
      await this.collabService.assertCanEdit(dto.roomSlug!, session)
    }
    const folder = getFolderForPurpose(dto.purpose, {
      userId: session.user.id,
      roomSlug: dto.roomSlug,
    })
    return this.storageService.generatePresignedUploadUrl(folder, dto.mimeType, dto.uploadType, {
      checksumSha256: dto.checksumSha256,
    })
  }

  @Post('multipart/create')
  @ResponseMessage('Multipart upload created')
  @ApiOkResponse({ type: MultipartUploadEntity })
  createMultipartUpload(@Body() dto: CreateMultipartUploadDto, @Session() session: UserSession) {
    const folder = getFolderForPurpose(dto.purpose, { userId: session.user.id })
    return this.storageService.createMultipartUpload(folder, dto.mimeType, dto.uploadType)
  }

  @Post('multipart/upload-part')
  @ResponseMessage('Part uploaded')
  @ApiOkResponse({ type: UploadedPartEntity })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        uploadId: { type: 'string' },
        partNumber: { type: 'integer' },
        chunk: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('chunk', { storage: memoryStorage() }))
  async uploadPart(@Body() dto: UploadPartDto, @UploadedFile() file: Express.Multer.File) {
    return this.storageService.uploadPart(dto.key, dto.uploadId, dto.partNumber, file.buffer)
  }

  @Post('multipart/complete')
  @ResponseMessage('Multipart upload completed')
  completeMultipartUpload(@Body() dto: CompleteMultipartUploadDto) {
    return this.storageService.completeMultipartUpload(dto.key, dto.uploadId)
  }

  @Delete('multipart/abort')
  @ResponseMessage('Multipart upload aborted')
  abortMultipartUpload(@Body() dto: AbortMultipartUploadDto) {
    return this.storageService.abortMultipartUpload(dto.key, dto.uploadId)
  }
}

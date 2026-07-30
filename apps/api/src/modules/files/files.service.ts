import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { UserRole } from '@/generated/prisma/client'
import { StorageService } from '@/modules/storage/storage.service'
import { PostsService } from '@/modules/posts/posts.service'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { IngestionService } from '@/modules/ai/ingestion/ingestion.service'
import { FilesRepository } from './files.repository'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name)

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly storageService: StorageService,
    private readonly postsService: PostsService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly ingestionService: IngestionService,
  ) {}

  async confirmUpload(postId: string, dto: ConfirmFileUploadDto, userId: string) {
    const post = await this.postsService.findOne(postId, { id: userId })
    if (!post.isOwner) throw new ForbiddenException('You do not own this post')

    if (!dto.key.startsWith(`posts/${userId}/`)) {
      throw new BadRequestException('Invalid file key')
    }

    const exists = await this.storageService.fileExists(dto.key)
    if (!exists) throw new BadRequestException('File has not been uploaded yet')

    const file = await this.filesRepository.create(postId, dto)

    if (post.status === 'APPROVED') {
      void this.aiSummaryService.summarizePost(postId)
    }

    // ingestFile is fire-and-forget: nothing awaits it, and there is no
    // unhandledRejection handler in this app, so an escaped rejection would take the
    // process down. ingestFile already records FAILED for the errors it can see; this
    // catches the ones it cannot -- a connection drop in its own findUnique or in its
    // catch-block status write.
    void this.ingestionService.ingestFile(file.id).catch((err: Error) => {
      this.logger.warn(`Ingestion dispatch failed for file ${file.id}: ${err.message}`)
    })
    void this.aiSummaryService.screenContent(postId)

    const { postId: _postId, ...rest } = file
    return rest
  }

  async getDownloadUrl(postId: string, fileId: string) {
    const file = await this.filesRepository.findById(fileId)
    if (!file) throw new NotFoundException('File not found')
    if (file.postId !== postId) throw new NotFoundException('File not found')
    const url = await this.storageService.generatePresignedDownloadUrl(file.key)
    return { url }
  }

  async recordDownload(postId: string, fileId: string) {
    const file = await this.filesRepository.findById(fileId)
    if (!file) throw new NotFoundException('File not found')
    if (file.postId !== postId) throw new NotFoundException('File not found')
    await this.filesRepository.incrementDownloads(fileId)
  }

  async remove(postId: string, fileId: string, userId: string, userRole: UserRole) {
    const file = await this.filesRepository.findById(fileId)
    if (!file) throw new NotFoundException('File not found')
    if (file.postId !== postId) throw new NotFoundException('File not found')

    const isOwner = file.post.authorId === userId
    const isAdmin = userRole === UserRole.ADMIN
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this file')

    await this.storageService.deleteFile(file.key)
    return this.filesRepository.delete(fileId)
  }
}

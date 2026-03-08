import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { UserRole } from '@/generated/prisma/client'
import { StorageService } from '@/modules/storage/storage.service'
import { PostsService } from '@/modules/posts/posts.service'
import { FilesRepository } from './files.repository'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'

@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly storageService: StorageService,
    private readonly postsService: PostsService,
  ) {}

  async confirmUpload(postId: string, dto: ConfirmFileUploadDto, userId: string) {
    const post = await this.postsService.findOne(postId)
    if (post.authorId !== userId) throw new ForbiddenException('You do not own this post')

    if (!dto.key.startsWith(`posts/${userId}/`)) {
      throw new BadRequestException('Invalid file key')
    }

    const exists = await this.storageService.fileExists(dto.key)
    if (!exists) throw new BadRequestException('File has not been uploaded yet')

    return this.filesRepository.create(postId, dto)
  }

  async getDownloadUrl(postId: string, fileId: string) {
    const file = await this.filesRepository.findById(fileId)
    if (!file) throw new NotFoundException('File not found')
    if (file.postId !== postId) throw new NotFoundException('File not found')
    const url = await this.storageService.generatePresignedDownloadUrl(file.key)
    void this.filesRepository.incrementDownloads(fileId)
    return { url }
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

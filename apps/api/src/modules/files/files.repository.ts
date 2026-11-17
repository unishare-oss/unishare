import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'
import type { PendingUploadFile } from '@/modules/storage/pending-uploads.types'
import { PendingUploadsRepository } from '@/modules/storage/pending-uploads.repository'

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(postId: string, dto: ConfirmFileUploadDto) {
    return this.prisma.file.create({ data: { postId, ...dto } })
  }

  async createWithPendingClaim(postId: string, dto: PendingUploadFile, ownerId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.pendingUpload.deleteMany({
        where: PendingUploadsRepository.claimableWhere(ownerId, [dto]),
      })
      if (claim.count !== 1) return { claimed: false as const }
      const file = await transaction.file.create({ data: { postId, ...dto } })
      return { claimed: true as const, file }
    })
  }

  findById(id: string) {
    return this.prisma.file.findUnique({
      where: { id },
      include: { post: { select: { authorId: true } } },
    })
  }

  incrementDownloads(id: string) {
    return this.prisma.file.update({ where: { id }, data: { downloads: { increment: 1 } } })
  }

  delete(id: string) {
    return this.prisma.file.delete({ where: { id } })
  }
}

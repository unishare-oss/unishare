import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { ConfirmFileUploadDto } from './dto/confirm-file-upload.dto'

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(postId: string, dto: ConfirmFileUploadDto) {
    return this.prisma.file.create({ data: { postId, ...dto } })
  }

  findById(id: string) {
    return this.prisma.file.findUnique({
      where: { id },
      include: { post: { select: { authorId: true } } },
    })
  }

  delete(id: string) {
    return this.prisma.file.delete({ where: { id } })
  }
}

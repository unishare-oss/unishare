import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class McpRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserAccess(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, role: true, universityId: true },
    })
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FacultiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(universityId?: string) {
    return this.prisma.faculty.findMany({
      where: universityId ? { universityId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, universityId: true },
    })
  }

  findById(id: string) {
    return this.prisma.faculty.findUnique({
      where: { id },
      select: { id: true, name: true, universityId: true },
    })
  }
}

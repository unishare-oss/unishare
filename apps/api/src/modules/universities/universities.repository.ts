import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class UniversitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.university.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, shortName: true, logoUrl: true },
    })
  }

  findById(id: string) {
    return this.prisma.university.findUnique({
      where: { id },
      select: { id: true, name: true, shortName: true, logoUrl: true },
    })
  }
}

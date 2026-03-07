import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly countInclude = {
    department: true,
    _count: {
      select: {
        posts: { where: { deletedAt: null, status: 'APPROVED' } },
        comments: { where: { deletedAt: null } },
        savedPosts: true,
      },
    },
  } as const

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: this.countInclude,
    })
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: this.countInclude,
    })
  }

  findDepartmentById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    })
  }

  updateAcademicProfile(id: string, dto: UpdateAcademicProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: this.countInclude,
    })
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    })
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { department: true },
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
      include: { department: true },
    })
  }
}

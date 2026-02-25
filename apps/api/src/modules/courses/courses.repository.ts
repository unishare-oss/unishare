import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto })
  }

  findAll() {
    return this.prisma.course.findMany({ orderBy: { createdAt: 'desc' } })
  }

  findById(id: string) {
    return this.prisma.course.findUnique({ where: { id } })
  }

  update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: dto })
  }

  remove(id: string) {
    return this.prisma.course.delete({ where: { id } })
  }
}

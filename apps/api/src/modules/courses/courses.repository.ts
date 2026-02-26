import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto, include: { department: true } })
  }

  findAll(pagination: PaginationDto) {
    return paginate(
      this.prisma.course,
      { orderBy: { createdAt: 'desc' }, include: { department: true } },
      pagination,
    )
  }

  findByCode(code: string) {
    return this.prisma.course.findUnique({ where: { code } })
  }

  findById(id: string) {
    return this.prisma.course.findUnique({ where: { id }, include: { department: true } })
  }

  update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: dto, include: { department: true } })
  }

  remove(id: string) {
    return this.prisma.course.delete({ where: { id } })
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

function mapCourse(course: any) {
  const { departmentId, ...rest } = course
  return rest
}

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto, include: { department: true } }).then(mapCourse)
  }

  async findAll(pagination: PaginationDto, departmentId?: string) {
    const result = await paginate(
      this.prisma.course,
      {
        where: departmentId ? { departmentId } : undefined,
        orderBy: { code: 'asc' },
        include: { department: true },
      },
      pagination,
    )
    return { ...result, items: result.items.map(mapCourse) }
  }

  findByCodeAndDept(code: string, departmentId: string) {
    return this.prisma.course.findUnique({ where: { code_departmentId: { code, departmentId } } })
  }

  findById(id: string) {
    return this.prisma.course
      .findUnique({ where: { id }, include: { department: true } })
      .then((c) => (c ? mapCourse(c) : null))
  }

  update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course
      .update({ where: { id }, data: dto, include: { department: true } })
      .then(mapCourse)
  }

  remove(id: string) {
    return this.prisma.course.delete({ where: { id } })
  }
}

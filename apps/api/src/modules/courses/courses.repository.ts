import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

function mapCourse(course: any) {
  const { departmentId: _departmentId, ...rest } = course
  return rest
}

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const course = await this.prisma.course.create({ data: dto, include: { department: true } })
    return mapCourse(course)
  }

  async findAll(pagination: PaginationDto, departmentId?: string, hasOutline?: boolean) {
    const result = await paginate(
      this.prisma.course,
      {
        where: {
          ...(departmentId ? { departmentId } : {}),
          ...(hasOutline ? { moduleOutlines: { some: {} } } : {}),
        },
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

  async findById(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id }, include: { department: true } })
    return c ? mapCourse(c) : null
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.update({
      where: { id },
      data: dto,
      include: { department: true },
    })
    return mapCourse(course)
  }

  async hasLinkedData(id: string) {
    const [posts, requests] = await Promise.all([
      this.prisma.post.count({ where: { courseId: id } }),
      this.prisma.postRequest.count({ where: { courseId: id } }),
    ])
    return { posts, requests }
  }

  remove(id: string) {
    return this.prisma.course.delete({ where: { id } })
  }

  findOutline(courseId: string) {
    return this.prisma.courseModuleOutline.findMany({
      where: { courseId },
      orderBy: { moduleNumber: 'asc' },
      select: { moduleNumber: true, topics: true },
    })
  }

  /** Full replace: the confirmed set from the editor (manual or post-extraction) is the new truth. */
  replaceOutline(courseId: string, modules: { moduleNumber: number; topics: string[] }[]) {
    return this.prisma.$transaction([
      this.prisma.courseModuleOutline.deleteMany({ where: { courseId } }),
      this.prisma.courseModuleOutline.createMany({
        data: modules.map((m) => ({ courseId, moduleNumber: m.moduleNumber, topics: m.topics })),
      }),
    ])
  }
}

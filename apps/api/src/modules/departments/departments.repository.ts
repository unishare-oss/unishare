import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

const facultySelect = { select: { id: true, name: true, universityId: true } }

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto })
  }

  findAll(universityId?: string) {
    return this.prisma.department.findMany({
      where: universityId ? { faculty: { universityId } } : undefined,
      orderBy: { name: 'asc' },
      include: { faculty: facultySelect, _count: { select: { courses: true } } },
    })
  }

  findByFacultyAndName(facultyId: string, name: string) {
    return this.prisma.department.findUnique({
      where: { facultyId_name: { facultyId, name } },
    })
  }

  findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: { faculty: facultySelect, courses: { orderBy: { name: 'asc' } } },
    })
  }

  update(id: string, dto: UpdateDepartmentDto) {
    return this.prisma.department.update({ where: { id }, data: dto })
  }

  remove(id: string) {
    return this.prisma.department.delete({ where: { id } })
  }
}

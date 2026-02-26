import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto })
  }

  findAll() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } })
  }

  findByName(name: string) {
    return this.prisma.department.findUnique({ where: { name } })
  }

  findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: { courses: { orderBy: { name: 'asc' } } },
    })
  }

  update(id: string, dto: UpdateDepartmentDto) {
    return this.prisma.department.update({ where: { id }, data: dto })
  }

  remove(id: string) {
    return this.prisma.department.delete({ where: { id } })
  }
}

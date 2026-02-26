import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { DepartmentsRepository } from './departments.repository'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  async create(dto: CreateDepartmentDto) {
    const existing = await this.departmentsRepository.findByName(dto.name)
    if (existing) throw new ConflictException('Department already exists')
    return this.departmentsRepository.create(dto)
  }

  findAll() {
    return this.departmentsRepository.findAll()
  }

  async findOne(id: string) {
    const department = await this.departmentsRepository.findById(id)
    if (!department) throw new NotFoundException('Department not found')
    return department
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id)
    return this.departmentsRepository.update(id, dto)
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.departmentsRepository.remove(id)
  }
}

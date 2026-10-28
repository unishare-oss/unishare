import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { FacultiesService } from '../faculties/faculties.service'
import { DepartmentsRepository } from './departments.repository'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

/** The unique (facultyId, name) index catches a duplicate created between the check and the write. */
function rethrowDuplicate(error: unknown): never {
  if ((error as { code?: string } | null)?.code === 'P2002') {
    throw new ConflictException('Department already exists')
  }
  throw error
}

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly facultiesService: FacultiesService,
  ) {}

  async create(dto: CreateDepartmentDto) {
    await this.facultiesService.findById(dto.facultyId)
    await this.assertNameFree(dto.facultyId, dto.name)
    return this.departmentsRepository.create(dto).catch(rethrowDuplicate)
  }

  async findAll(universityId?: string) {
    const departments = await this.departmentsRepository.findAll(universityId)
    return departments.map(({ _count, ...dept }) => ({
      ...dept,
      courseCount: _count.courses,
    }))
  }

  async findOne(id: string) {
    const department = await this.departmentsRepository.findById(id)
    if (!department) throw new NotFoundException('Department not found')
    return department
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    // PartialType's @IsOptional lets null through, and neither column is nullable
    if (dto.facultyId === null || dto.name === null) {
      throw new BadRequestException('name and facultyId cannot be null')
    }
    const department = await this.findOne(id)
    if (dto.facultyId !== undefined) {
      const faculty = await this.facultiesService.findById(dto.facultyId)
      // Its members' university wouldn't match their department any more
      if (faculty.universityId !== department.faculty.universityId) {
        throw new BadRequestException('A department cannot move to another university')
      }
    }
    await this.assertNameFree(
      dto.facultyId ?? department.facultyId,
      dto.name ?? department.name,
      id,
    )
    return this.departmentsRepository.update(id, dto).catch(rethrowDuplicate)
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.departmentsRepository.remove(id)
  }

  private async assertNameFree(facultyId: string, name: string, exceptId?: string) {
    const existing = await this.departmentsRepository.findByFacultyAndName(facultyId, name)
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Department already exists')
    }
  }
}

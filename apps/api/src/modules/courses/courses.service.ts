import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { CoursesRepository } from './courses.repository'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async create(dto: CreateCourseDto) {
    const existing = await this.coursesRepository.findByCode(dto.code)
    if (existing) throw new ConflictException('Course code already exists')
    return this.coursesRepository.create(dto)
  }

  findAll(pagination: PaginationDto, departmentId?: string) {
    return this.coursesRepository.findAll(pagination, departmentId)
  }

  async findOne(id: string) {
    const course = await this.coursesRepository.findById(id)
    if (!course) throw new NotFoundException('Course not found')
    return course
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id)
    return this.coursesRepository.update(id, dto)
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.coursesRepository.remove(id)
  }
}

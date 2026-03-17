import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { CoursesRepository } from './courses.repository'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async create(dto: CreateCourseDto) {
    const existing = await this.coursesRepository.findByCodeAndDept(dto.code, dto.departmentId)
    if (existing) throw new ConflictException('Course code already exists in this department')
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
    const { posts, requests } = await this.coursesRepository.hasLinkedData(id)
    if (posts > 0 || requests > 0) {
      throw new ConflictException(
        `Cannot delete: this course has ${posts} post(s) and ${requests} request(s) linked to it`,
      )
    }
    return this.coursesRepository.remove(id)
  }
}

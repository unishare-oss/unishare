import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { SUPPORTED_MIME_TYPES } from '@/modules/ai/extraction/document-extractor.service'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { StorageService } from '@/modules/storage/storage.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { CoursesRepository } from './courses.repository'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { CourseModuleOutlineEntryDto } from './dto/course-module-outline-entry.dto'

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly aiSummary: AiSummaryService,
    private readonly storageService: StorageService,
  ) {}

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

  async getOutline(courseId: string) {
    await this.findOne(courseId)
    return this.coursesRepository.findOutline(courseId)
  }

  async replaceOutline(courseId: string, modules: CourseModuleOutlineEntryDto[]) {
    await this.findOne(courseId)
    await this.coursesRepository.replaceOutline(courseId, modules)
    return this.coursesRepository.findOutline(courseId)
  }

  /** Preview only — does not persist. The caller confirms via replaceOutline. */
  async extractOutlineFromFile(courseId: string, key: string, mimeType: string) {
    await this.findOne(courseId)

    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException('Only PDF and Word documents are supported')
    }

    const buffer = await this.storageService.getObjectBuffer(key)
    const text = await this.aiSummary.extractTextFromBuffer(buffer, mimeType)
    if (!text.trim()) {
      throw new BadRequestException('Could not extract text from the uploaded file')
    }

    return this.aiSummary.extractCourseOutline(text)
  }
}

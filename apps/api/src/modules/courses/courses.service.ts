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
import { UniversityScope } from '@/common/university-scope'
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

  findAll(
    pagination: PaginationDto,
    scope: UniversityScope,
    departmentId?: string,
    hasOutline?: boolean,
  ) {
    return this.coursesRepository.findAll(pagination, scope, departmentId, hasOutline)
  }

  async findOne(id: string, scope: UniversityScope) {
    const course = await this.coursesRepository.findById(id, scope)
    if (!course) throw new NotFoundException('Course not found')
    return course
  }

  async update(id: string, dto: UpdateCourseDto, scope: UniversityScope) {
    await this.findOne(id, scope)
    return this.coursesRepository.update(id, dto)
  }

  async remove(id: string, scope: UniversityScope) {
    await this.findOne(id, scope)
    const { posts, requests } = await this.coursesRepository.hasLinkedData(id)
    if (posts > 0 || requests > 0) {
      throw new ConflictException(
        `Cannot delete: this course has ${posts} post(s) and ${requests} request(s) linked to it`,
      )
    }
    return this.coursesRepository.remove(id)
  }

  async getOutline(courseId: string, scope: UniversityScope) {
    await this.findOne(courseId, scope)
    return this.coursesRepository.findOutline(courseId)
  }

  async replaceOutline(
    courseId: string,
    modules: CourseModuleOutlineEntryDto[],
    scope: UniversityScope,
  ) {
    await this.findOne(courseId, scope)
    await this.coursesRepository.replaceOutline(courseId, modules)
    return this.coursesRepository.findOutline(courseId)
  }

  /** Preview only — does not persist. The caller confirms via replaceOutline. */
  async extractOutlineFromFile(
    courseId: string,
    key: string,
    mimeType: string,
    scope: UniversityScope,
  ) {
    await this.findOne(courseId, scope)

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

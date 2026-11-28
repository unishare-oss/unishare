import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { StorageService } from '@/modules/storage/storage.service'
import { PendingUploadsService } from '@/modules/storage/pending-uploads.service'
import {
  DocumentExtractorService,
  SUPPORTED_MIME_TYPES,
} from '@/modules/ai/extraction/document-extractor.service'
import { EmbeddingService } from '@/modules/ai/embedding/embedding.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { UniversityScope } from '@/common/university-scope'
import { CoursesRepository } from './courses.repository'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { CourseModuleOutlineEntryDto } from './dto/course-module-outline-entry.dto'
import { SuggestCourseFileDto, SuggestCoursesDto } from './dto/suggest-courses.dto'
import { MATCH_MIN_SIMILARITY } from './courses.constants'

const MAX_MATCH_FILES = 5
const MAX_FILE_SAMPLE_CHARS = 4_000
const MAX_TOTAL_SAMPLE_CHARS = 12_000
type SuggestionCandidate = { id: string; code: string; name: string }

function noSuggestions(available: boolean) {
  return { suggestions: [], available }
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name)

  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly aiSummary: AiSummaryService,
    private readonly storageService: StorageService,
    private readonly pendingUploads: PendingUploadsService,
    private readonly extractor: DocumentExtractorService,
    private readonly embedding: EmbeddingService,
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

  async suggest(dto: SuggestCoursesDto, userId: string, scope: UniversityScope) {
    const department = await this.coursesRepository.findDepartmentInScope(dto.departmentId, scope)
    if (!department) throw new NotFoundException('Department not found')

    const files = await this.ownedSupportedFiles(dto.files, userId)
    const candidates = await this.coursesRepository.findSuggestionCandidates(
      dto.departmentId,
      scope,
    )
    if (candidates.length === 0) return noSuggestions(true)
    if (!this.embedding.enabled) return noSuggestions(false)

    try {
      const samples = await this.sampleFiles(files)
      if (samples.length === 0) return noSuggestions(true)

      const vector = await this.embedding.embedQuery(samples.join('\n\n'))
      const ids = await this.coursesRepository.findNearestCourses(
        vector,
        candidates.map(({ id }) => id),
        MATCH_MIN_SIMILARITY,
      )
      const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
      const suggestions = ids
        .map((id) => byId.get(id))
        .filter((candidate): candidate is SuggestionCandidate => candidate !== undefined)
      return { suggestions, available: true }
    } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.warn('Course matching failed; suggestions are unavailable')
      return noSuggestions(false)
    }
  }

  /** Supported files only; throws unless the user owns an unclaimed upload for each. */
  private async ownedSupportedFiles(files: SuggestCourseFileDto[], userId: string) {
    const supported = files.filter((file) => SUPPORTED_MIME_TYPES.includes(file.mimeType))
    await this.pendingUploads.assertAvailable(
      userId,
      supported.map(({ key, mimeType }) => ({ key, mimeType })),
    )
    return supported
  }

  /** Text from the first files, within the per-file and total character limits. */
  private async sampleFiles(files: SuggestCourseFileDto[]) {
    const samples: string[] = []
    let remaining = MAX_TOTAL_SAMPLE_CHARS
    for (const file of files.slice(0, MAX_MATCH_FILES)) {
      if (remaining <= 0) break
      const text = await this.extractor.extractSampleFromKey(file.key, file.mimeType)
      const sample = text.slice(0, Math.min(MAX_FILE_SAMPLE_CHARS, remaining))
      if (sample.trim()) {
        samples.push(sample)
        remaining -= sample.length
      }
    }
    return samples
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

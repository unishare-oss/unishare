import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { UniversityScope } from '@/common/university-scope'
import { LlmService } from '@/modules/ai/llm/llm.service'
import {
  DocumentExtractorService,
  SUPPORTED_MIME_TYPES,
} from '@/modules/ai/extraction/document-extractor.service'
import { CoursesService } from '@/modules/courses/courses.service'
import { normalizeCourseCode } from '@/modules/courses/course-code'
import { UniversitiesService } from '@/modules/universities/universities.service'
import { ExamsRepository } from './exams.repository'

const CHUNK_SIZE = 4_000
const MAX_CHUNKS = 12
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type DraftExamRow = {
  courseCode: string
  date: string
  startsAt: string
  endsAt: string | null
  title: string
  examRoom: string | null
}

@Injectable()
export class ExamImportService {
  constructor(
    private readonly extractor: DocumentExtractorService,
    private readonly llm: LlmService,
    private readonly courses: CoursesService,
    private readonly exams: ExamsRepository,
    private readonly universities: UniversitiesService,
  ) {}

  async parse(
    file: Express.Multer.File | undefined,
    scope: UniversityScope,
    universityId?: string,
  ) {
    let importScope: UniversityScope
    if (scope.kind === 'all') {
      if (!universityId) {
        throw new BadRequestException('A university scope is required to import exams')
      }
      importScope = await this.requireUniversityScope(universityId)
    } else if (scope.kind === 'none') {
      throw new BadRequestException('A university scope is required to import exams')
    } else {
      if (universityId) {
        throw new BadRequestException('Moderators cannot choose a university')
      }
      importScope = scope
    }
    if (!file) throw new BadRequestException('Timetable file is required')
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are supported')
    }
    if (!this.llm.enabled) throw new ServiceUnavailableException('AI service not configured')

    const extracted = await this.extractor.extractFromBuffer(file.buffer, file.mimetype)
    const text = extracted.pages
      .map((page) => page.text.trim())
      .filter(Boolean)
      .join('\n\n')

    const chunks = chunkTextByLines(text)
    if (chunks.length > MAX_CHUNKS) {
      throw new BadRequestException('Timetable is too large; split it by faculty')
    }

    const drafts: DraftExamRow[] = []
    for (const chunk of chunks) drafts.push(...(await this.extractRows(chunk)))

    const requestedCodes = new Set(drafts.map((row) => normalizeCourseCode(row.courseCode)))
    if (requestedCodes.size === 0) return { rows: [] }

    const courses = await this.courses.findAllInScope(importScope)
    const byCode = new Map<string, typeof courses>()
    for (const course of courses) {
      const code = normalizeCourseCode(course.code)
      if (!requestedCodes.has(code)) continue
      byCode.set(code, [...(byCode.get(code) ?? []), course])
    }

    const rows = drafts.map((row) => {
      const matches = byCode.get(normalizeCourseCode(row.courseCode)) ?? []
      const match = matches.length === 1 ? matches[0] : null
      return {
        ...row,
        courseId: match?.id ?? null,
        courseName: match?.name ?? null,
        candidates:
          matches.length > 1
            ? matches.map(({ id, code, name, department }) => ({
                id,
                code,
                name,
                departmentName: department.name,
              }))
            : [],
        matchStatus:
          matches.length === 1 ? 'matched' : matches.length > 1 ? 'ambiguous' : 'unmatched',
      }
    })
    const courseIds = [...new Set(rows.flatMap((row) => (row.courseId ? [row.courseId] : [])))]
    const existingExams =
      courseIds.length > 0 ? await this.exams.findUpcomingForCourses(courseIds, new Date()) : []
    const examsByCourse = new Map<string, typeof existingExams>()
    for (const exam of existingExams) {
      examsByCourse.set(exam.courseId, [...(examsByCourse.get(exam.courseId) ?? []), exam])
    }

    return {
      rows: rows.map((row) => ({
        ...row,
        existingExams: row.courseId
          ? (examsByCourse.get(row.courseId) ?? []).map(
              ({ id, title, startsAt, endsAt, examRoom }) => ({
                id,
                title,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt?.toISOString() ?? null,
                examRoom,
              }),
            )
          : [],
      })),
    }
  }

  private async requireUniversityScope(universityId: string): Promise<UniversityScope> {
    await this.universities.findById(universityId)
    return { kind: 'university', universityId }
  }

  private async extractRows(text: string): Promise<DraftExamRow[]> {
    const response = await this.llm.chat(
      [
        {
          role: 'system',
          content:
            'Extract exam timetable rows from the supplied text. Return only a JSON array of objects with courseCode, date (YYYY-MM-DD), startsAt and optional endsAt (HH:mm), title, and optional room. Do not invent values; omit rows missing a course code, valid date, start time, or title. Keep times local as printed.',
        },
        { role: 'user', content: text },
      ],
      { maxTokens: 4000, temperature: 0 },
    )
    if (!response) throw new BadRequestException('Could not read timetable rows')

    const match = response.match(/\[[\s\S]*\]/)
    if (!match) throw new BadRequestException('Could not read timetable rows')
    let parsed: unknown
    try {
      parsed = JSON.parse(match[0])
    } catch {
      throw new BadRequestException('Could not read timetable rows')
    }
    if (!Array.isArray(parsed)) throw new BadRequestException('Could not read timetable rows')

    return parsed.flatMap((value): DraftExamRow[] => {
      if (!value || typeof value !== 'object') return []
      const row = value as Record<string, unknown>
      const courseCode = typeof row.courseCode === 'string' ? row.courseCode.trim() : ''
      const date = typeof row.date === 'string' ? row.date : ''
      const startsAt = typeof row.startsAt === 'string' ? row.startsAt : ''
      const endsAt = typeof row.endsAt === 'string' ? row.endsAt : null
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      if (
        !courseCode ||
        !title ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
        !TIME_PATTERN.test(startsAt) ||
        (endsAt !== null && (!TIME_PATTERN.test(endsAt) || endsAt <= startsAt))
      ) {
        return []
      }
      return [
        {
          courseCode,
          date,
          startsAt,
          endsAt,
          title,
          examRoom: typeof row.room === 'string' ? row.room : null,
        },
      ]
    })
  }
}

function chunkTextByLines(text: string): string[] {
  const chunks: string[] = []
  let current = ''

  for (const line of text.split(/\r?\n/)) {
    if (line.length > CHUNK_SIZE) {
      if (current) chunks.push(current)
      current = ''
      for (let offset = 0; offset < line.length; offset += CHUNK_SIZE) {
        chunks.push(line.slice(offset, offset + CHUNK_SIZE))
      }
      continue
    }

    const candidate = current ? `${current}\n${line}` : line
    if (candidate.length > CHUNK_SIZE) {
      chunks.push(current)
      current = line
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks
}

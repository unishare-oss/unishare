import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { UniversityScope } from '@/common/university-scope'
import { LlmService } from '@/modules/ai/llm/llm.service'
import {
  DocumentExtractorService,
  type ExtractedDocument,
  SUPPORTED_MIME_TYPES,
} from '@/modules/ai/extraction/document-extractor.service'
import { CoursesService } from '@/modules/courses/courses.service'
import { normalizeCourseCode } from '@/modules/courses/course-code'
import { UniversitiesService } from '@/modules/universities/universities.service'
import { ExamsRepository } from './exams.repository'
import * as ExamTimetableLayout from './exam-timetable-layout'

const CHUNK_SIZE = 4_000
const MAX_CHUNKS = 12
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

class UnreadableChunkError extends Error {}

type ChunkResult = { rows: DraftExamRow[]; droppedCount: number }

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
    if (!this.llm.enabled) {
      throw new ServiceUnavailableException(
        'Timetable import is unavailable because AI is not configured. Add exams by hand instead.',
      )
    }

    let extracted: ExtractedDocument
    try {
      extracted = await this.extractor.extractFromBuffer(file.buffer, file.mimetype)
    } catch {
      throw new BadRequestException(
        'Could not open this file. Make sure it is a valid PDF or Word document.',
      )
    }
    const plainText = extracted.pages
      .map((page) => page.text.trim())
      .filter(Boolean)
      .join('\n\n')
    if (!plainText) {
      throw new BadRequestException(
        'No text found in this file. Scanned timetables are not supported.',
      )
    }

    const rebuiltPdfText =
      file.mimetype === 'application/pdf' ? await this.rebuildPdfText(file, extracted) : null
    let rowsRebuilt = rebuiltPdfText !== null
    const text = rebuiltPdfText ?? plainText

    let chunks = chunkTextByLines(text)
    if (chunks.length > MAX_CHUNKS && rowsRebuilt) {
      const plainTextChunks = chunkTextByLines(plainText)
      if (plainTextChunks.length <= MAX_CHUNKS) {
        chunks = plainTextChunks
        rowsRebuilt = false
      }
    }
    if (chunks.length > MAX_CHUNKS) {
      throw new BadRequestException('Timetable is too large; split it by faculty')
    }

    const drafts: DraftExamRow[] = []
    let droppedCount = 0
    let unreadableChunkCount = 0
    for (const chunk of chunks) {
      try {
        const chunkResult = await this.extractRows(chunk, rowsRebuilt)
        drafts.push(...chunkResult.rows)
        droppedCount += chunkResult.droppedCount
      } catch (error) {
        // Only unreadable output is per chunk; busy or misconfigured AI propagates unchanged.
        if (!(error instanceof UnreadableChunkError)) throw error
        unreadableChunkCount++
      }
    }
    if (unreadableChunkCount === chunks.length) {
      throw new BadGatewayException('The AI could not read this timetable. Try again.')
    }

    const requestedCodes = new Set(drafts.map((row) => normalizeCourseCode(row.courseCode)))
    if (requestedCodes.size === 0) return { rows: [], droppedCount, unreadableChunkCount }

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
      droppedCount,
      unreadableChunkCount,
    }
  }

  private async rebuildPdfText(
    file: Express.Multer.File,
    extracted: ExtractedDocument,
  ): Promise<string | null> {
    let positionedPages: ExamTimetableLayout.PositionedTextItem[][]
    try {
      positionedPages = await ExamTimetableLayout.readPositionedPdfPages(file.buffer)
    } catch {
      return null
    }

    let rebuiltAnyPage = false
    const pageTexts = extracted.pages.map((page, index) => {
      const rebuilt = ExamTimetableLayout.rebuildTimetableRows(positionedPages[index] ?? [])
      if (!rebuilt) return page.text.trim()

      rebuiltAnyPage = true
      return rebuilt.join('\n')
    })
    return rebuiltAnyPage ? pageTexts.join('\n\n') : null
  }

  private async requireUniversityScope(universityId: string): Promise<UniversityScope> {
    await this.universities.findById(universityId)
    return { kind: 'university', universityId }
  }

  private async extractRows(text: string, rowsRebuilt: boolean): Promise<ChunkResult> {
    const rowInstruction = rowsRebuilt ? 'Lines that start with a date are one exam row each.' : ''
    const response = await this.llm.chat(
      [
        {
          role: 'system',
          content: [
            'Extract exam timetable rows from the supplied text.',
            rowInstruction,
            'Return only a JSON array of objects with courseCode, date (YYYY-MM-DD), startsAt and optional endsAt (HH:mm), title, and optional room. Do not invent values; omit rows missing a course code, valid date, start time, or title. Keep times local as printed. Dates must use the Gregorian calendar; convert Thai Buddhist-era years (for example 2569) by subtracting 543.',
          ]
            .filter(Boolean)
            .join(' '),
        },
        { role: 'user', content: text },
      ],
      { maxTokens: 8000, temperature: 0 },
    )
    if (!response) throw new UnreadableChunkError()

    const parsed = parseJsonArray(response)
    if (!Array.isArray(parsed)) throw new UnreadableChunkError()

    const rows: DraftExamRow[] = []
    let droppedCount = 0
    for (const value of parsed) {
      if (!value || typeof value !== 'object') {
        droppedCount++
        continue
      }
      const row = value as Record<string, unknown>
      const courseCode = typeof row.courseCode === 'string' ? row.courseCode.trim() : ''
      const date = toGregorianDate(typeof row.date === 'string' ? row.date : '')
      const startsAt = typeof row.startsAt === 'string' ? row.startsAt : ''
      const endsAt = typeof row.endsAt === 'string' ? row.endsAt : null
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      if (
        !courseCode ||
        !title ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
        isOutsideWindow(date) ||
        !TIME_PATTERN.test(startsAt) ||
        (endsAt !== null && (!TIME_PATTERN.test(endsAt) || endsAt <= startsAt))
      ) {
        droppedCount++
        continue
      }
      rows.push({
        courseCode,
        date,
        startsAt,
        endsAt,
        title,
        examRoom: typeof row.room === 'string' ? row.room : null,
      })
    }
    return { rows, droppedCount }
  }
}

// Thai timetables print Buddhist-era years (2569 = 2026); the model is told to convert them.
function toGregorianDate(date: string): string {
  const match = date.match(/^(\d{4})(-\d{2}-\d{2})$/)
  return match && Number(match[1]) >= 2400 ? `${Number(match[1]) - 543}${match[2]}` : date
}

// A date more than two years from today is almost certainly a misread year.
function isOutsideWindow(date: string): boolean {
  const time = Date.parse(`${date}T00:00:00Z`)
  return Math.abs(time - Date.now()) > 2 * 366 * 24 * 60 * 60 * 1000
}

function parseJsonArray(reply: string): unknown[] | null {
  const text = reply.replace(/```(?:json)?/gi, '').trim()
  const parse = (value: string): unknown => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const whole = parse(text)
  if (Array.isArray(whole)) return whole

  // Prose such as "[TBC]" or an object wrapper: prefer an array of objects, then a bare `[]`.
  const list = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  const parsed = list ? parse(list[0]) : null
  if (Array.isArray(parsed)) return parsed
  return /\[\s*\]/.test(text) ? [] : null
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

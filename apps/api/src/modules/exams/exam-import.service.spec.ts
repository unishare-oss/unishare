import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ExamImportService } from './exam-import.service'

describe('ExamImportService.parse', () => {
  const scope = { kind: 'university' as const, universityId: 'university-1' }
  let service: ExamImportService
  let extractor: { extractFromBuffer: jest.Mock }
  let llm: { enabled: boolean; chat: jest.Mock }
  let courses: { findAllInScope: jest.Mock }
  let universities: { findById: jest.Mock }
  let exams: { findUpcomingForCourses: jest.Mock }
  const buffer = Buffer.from('document')
  const document = (text: string) => ({ pages: [{ num: 1, text }], hasPageNumbers: true })
  const file = (mimetype: string, size = buffer.length) => ({
    fieldname: 'file',
    originalname: 'timetable',
    encoding: '7bit',
    mimetype,
    size,
    buffer,
  })

  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date('2026-11-21T00:00:00Z'),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'queueMicrotask',
        'performance',
      ],
    })
    extractor = {
      extractFromBuffer: jest.fn().mockResolvedValue(document('CS 101 exam timetable')),
    }
    llm = {
      enabled: true,
      chat: jest
        .fn()
        .mockResolvedValue(
          '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","endsAt":"12:00","title":"Final exam","room":"A-101"}]',
        ),
    }
    courses = {
      findAllInScope: jest
        .fn()
        .mockResolvedValue([
          { id: 'course-1', code: 'CS 101', name: 'Programming', department: { id: 'dept-1' } },
        ]),
    }
    exams = { findUpcomingForCourses: jest.fn().mockResolvedValue([]) }
    universities = { findById: jest.fn().mockResolvedValue({ id: 'university-1' }) }
    service = new ExamImportService(
      extractor as never,
      llm as never,
      courses as never,
      exams as never,
      universities as never,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('extracts and matches a PDF buffer without storing it', async () => {
    const uploaded = file('application/pdf')
    const result = await service.parse(uploaded as never, scope)

    expect(result.rows).toEqual([
      {
        courseCode: 'CS101',
        courseId: 'course-1',
        courseName: 'Programming',
        candidates: [],
        date: '2026-12-10',
        startsAt: '09:00',
        endsAt: '12:00',
        title: 'Final exam',
        examRoom: 'A-101',
        existingExams: [],
        matchStatus: 'matched',
      },
    ])
    expect(extractor.extractFromBuffer).toHaveBeenCalledWith(buffer, 'application/pdf')
    expect(llm.chat).toHaveBeenCalledTimes(1)
    expect(courses.findAllInScope).toHaveBeenCalledWith(scope)
  })

  it('attaches upcoming exams for the uniquely matched course', async () => {
    exams.findUpcomingForCourses.mockResolvedValue([
      {
        id: 'exam-existing',
        courseId: 'course-1',
        title: 'Final exam',
        startsAt: new Date('2026-12-09T02:00:00.000Z'),
        endsAt: new Date('2026-12-09T05:00:00.000Z'),
        examRoom: 'B-12',
      },
    ])

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(exams.findUpcomingForCourses).toHaveBeenCalledWith(['course-1'], expect.any(Date))
    expect(result.rows[0]).toMatchObject({
      existingExams: [
        {
          id: 'exam-existing',
          title: 'Final exam',
          startsAt: '2026-12-09T02:00:00.000Z',
          endsAt: '2026-12-09T05:00:00.000Z',
          examRoom: 'B-12',
        },
      ],
    })
  })

  it('extracts a Word buffer using its MIME type', async () => {
    const uploaded = file('application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    const result = await service.parse(uploaded as never, scope)

    expect(extractor.extractFromBuffer).toHaveBeenCalledWith(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(result.rows[0]).toMatchObject({ courseId: 'course-1', matchStatus: 'matched' })
  })

  it('returns scoped candidates for ambiguous rows and preserves all three match statuses', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CSC219","date":"2026-12-10","startsAt":"09:00","title":"Final exam"},{"courseCode":"CS101","date":"2026-12-11","startsAt":"09:00","title":"Final exam"},{"courseCode":"MATH999","date":"2026-12-12","startsAt":"09:00","title":"Final exam"}]',
    )
    courses.findAllInScope.mockResolvedValue([
      {
        id: 'course-csc-1',
        code: 'CSC219',
        name: 'Intro to data structures',
        department: { name: 'Computer Science' },
      },
      {
        id: 'course-csc-2',
        code: 'CSC 219',
        name: 'Data structures and algorithms',
        department: { name: 'Computing' },
      },
      { id: 'course-cs101', code: 'CS101', name: 'Programming' },
    ])

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(result.rows.map(({ matchStatus }) => matchStatus)).toEqual([
      'ambiguous',
      'matched',
      'unmatched',
    ])
    expect(result.rows[0]).toMatchObject({
      courseId: null,
      courseName: null,
      candidates: [
        {
          id: 'course-csc-1',
          code: 'CSC219',
          name: 'Intro to data structures',
          departmentName: 'Computer Science',
        },
        {
          id: 'course-csc-2',
          code: 'CSC 219',
          name: 'Data structures and algorithms',
          departmentName: 'Computing',
        },
      ],
    })
    expect(result.rows[1].candidates).toEqual([])
    expect(result.rows[2].candidates).toEqual([])
    expect(courses.findAllInScope).toHaveBeenCalledWith(scope)
  })

  it('rejects an unsupported MIME type before extraction', async () => {
    await expect(service.parse(file('image/png') as never, scope)).rejects.toThrow(
      BadRequestException,
    )
    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
  })

  it('requires admins to choose an existing university and matches only its courses', async () => {
    await expect(service.parse(file('application/pdf') as never, { kind: 'all' })).rejects.toThrow(
      BadRequestException,
    )
    universities.findById.mockResolvedValue({ id: 'university-2' })
    courses.findAllInScope.mockResolvedValue([
      { id: 'course-2', code: 'CS 101', name: 'Other Programming', department: { id: 'dept-2' } },
    ])

    const result = await service.parse(
      file('application/pdf') as never,
      { kind: 'all' },
      'university-2',
    )

    expect(universities.findById).toHaveBeenCalledWith('university-2')
    expect(courses.findAllInScope).toHaveBeenCalledWith({
      kind: 'university',
      universityId: 'university-2',
    })
    expect(result.rows[0]).toMatchObject({ courseId: 'course-2', courseName: 'Other Programming' })
  })

  it('rejects a moderator without a university before extraction or LLM parsing', async () => {
    await expect(service.parse(file('application/pdf') as never, { kind: 'none' })).rejects.toThrow(
      BadRequestException,
    )

    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
    expect(llm.chat).not.toHaveBeenCalled()
  })

  it('returns not found for an unknown admin university', async () => {
    universities.findById.mockRejectedValue(new NotFoundException())
    await expect(
      service.parse(file('application/pdf') as never, { kind: 'all' }, 'unknown'),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
  })

  it('rejects a moderator university override and preserves their own scope', async () => {
    await expect(
      service.parse(file('application/pdf') as never, scope, 'university-2'),
    ).rejects.toThrow(BadRequestException)
    expect(courses.findAllInScope).not.toHaveBeenCalled()

    await service.parse(file('application/pdf') as never, scope)
    expect(courses.findAllInScope).toHaveBeenCalledWith(scope)
  })

  it('rejects a missing file', async () => {
    await expect(service.parse(undefined, scope)).rejects.toThrow(BadRequestException)
    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
  })

  it('matches spaced and lowercase parsed codes to a compact course code', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CSC 219","date":"2026-12-10","startsAt":"09:00","title":"Final exam"},{"courseCode":"csc219","date":"2026-12-11","startsAt":"09:00","title":"Final exam"}]',
    )
    courses.findAllInScope.mockResolvedValue([
      { id: 'course-219', code: 'CSC219', name: 'Data Structures' },
    ])

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(courses.findAllInScope).toHaveBeenCalledWith(scope)
    expect(result.rows).toHaveLength(2)
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseCode: 'CSC 219',
          courseId: 'course-219',
          courseName: 'Data Structures',
          matchStatus: 'matched',
        }),
        expect.objectContaining({
          courseCode: 'csc219',
          courseId: 'course-219',
          courseName: 'Data Structures',
          matchStatus: 'matched',
        }),
      ]),
    )
  })

  it('does not load courses when extraction returns no codes', async () => {
    llm.chat.mockResolvedValue('[]')

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(result.rows).toEqual([])
    expect(courses.findAllInScope).not.toHaveBeenCalled()
    expect(exams.findUpcomingForCourses).not.toHaveBeenCalled()
  })

  it('does not query existing exams when no rows matched a course', async () => {
    courses.findAllInScope.mockResolvedValue([])

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(result.rows[0]).toMatchObject({ courseId: null, existingExams: [] })
    expect(exams.findUpcomingForCourses).not.toHaveBeenCalled()
  })

  it('turns an unreadable or corrupt file into a 400', async () => {
    extractor.extractFromBuffer.mockRejectedValue(new Error('bad document'))

    const error = await service.parse(file('application/pdf') as never, scope).catch((e) => e)
    expect(error).toBeInstanceOf(BadRequestException)
    expect(error.message).toMatch(/could not open this file/i)
    expect(llm.chat).not.toHaveBeenCalled()
  })

  it('keeps lines intact when splitting text into LLM chunks', async () => {
    const lines = ['A'.repeat(1500), 'B'.repeat(1500), 'C'.repeat(1500)]
    extractor.extractFromBuffer.mockResolvedValue(document(lines.join('\n')))

    await service.parse(file('application/pdf') as never, scope)

    const chunks = llm.chat.mock.calls.map((call) => call[0][1].content as string)
    expect(chunks).toEqual([`${lines[0]}\n${lines[1]}`, lines[2]])
    expect(chunks.every((chunk) => chunk.length <= 4000)).toBe(true)
  })

  it('splits a single overlong line and enforces the twelve chunk limit', async () => {
    extractor.extractFromBuffer.mockResolvedValue(document('A'.repeat(4001)))
    await service.parse(file('application/pdf') as never, scope)
    expect(llm.chat.mock.calls.map((call) => (call[0][1].content as string).length)).toEqual([
      4000, 1,
    ])

    llm.chat.mockClear()
    extractor.extractFromBuffer.mockResolvedValue(
      document(Array(13).fill('A'.repeat(4000)).join('\n')),
    )
    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      BadRequestException,
    )
    expect(llm.chat).not.toHaveBeenCalled()
  })

  it('rejects a file with no extractable text before calling the LLM', async () => {
    extractor.extractFromBuffer.mockResolvedValue(document('  \n '))
    const error = await service.parse(file('application/pdf') as never, scope).catch((e) => e)
    expect(error).toBeInstanceOf(BadRequestException)
    expect(error.message).toMatch(/no text found/i)
    expect(llm.chat).not.toHaveBeenCalled()
  })

  it('asks to split a timetable above the chunk limit by faculty', async () => {
    extractor.extractFromBuffer.mockResolvedValue(
      document(Array(13).fill('A'.repeat(4000)).join('\n')),
    )
    const error = await service.parse(file('application/pdf') as never, scope).catch((e) => e)
    expect(error).toBeInstanceOf(BadRequestException)
    expect(error.message).toMatch(/split it by faculty/i)
  })

  it('tells the user to add exams by hand when AI is off', async () => {
    llm.enabled = false
    const error = await service.parse(file('application/pdf') as never, scope).catch((e) => e)
    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect(error.message).toMatch(/add exams by hand/i)
    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
  })

  it('passes through a busy AI as 503', async () => {
    llm.chat.mockRejectedValue(new ServiceUnavailableException('The AI service is busy.'))
    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      ServiceUnavailableException,
    )
  })

  it('keeps rows from readable chunks and counts the unreadable one', async () => {
    extractor.extractFromBuffer.mockResolvedValue(
      document([`${'A'.repeat(3000)}`, `${'B'.repeat(3000)}`].join('\n')),
    )
    llm.chat
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(
        '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]',
      )

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(result.rows).toHaveLength(1)
    expect(result.droppedCount).toBe(0)
    expect(result.unreadableChunkCount).toBe(1)
  })

  it('returns 502 when every chunk is unreadable', async () => {
    llm.chat.mockResolvedValue('not json')
    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      BadGatewayException,
    )
  })

  it('drops invalid AI rows and returns how many', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"},{"courseCode":"CS102","date":"2026-02-31","startsAt":"09:00","title":"Bad date"},"junk",{"courseCode":"","date":"2026-12-10","startsAt":"09:00","title":"x"}]',
    )

    const result = await service.parse(file('application/pdf') as never, scope)

    expect(result.rows).toHaveLength(1)
    expect(result.droppedCount).toBe(3)
  })

  it('reports zero dropped rows when nothing is dropped', async () => {
    llm.chat.mockResolvedValue('[]')
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result).toEqual({ rows: [], droppedCount: 0, unreadableChunkCount: 0 })
  })

  it('propagates LLM errors that are not an unreadable chunk or a busy AI', async () => {
    llm.chat.mockRejectedValue(new Error('invalid api key'))
    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      'invalid api key',
    )
  })

  it('accepts exactly twelve chunks', async () => {
    extractor.extractFromBuffer.mockResolvedValue(
      document(Array(12).fill('A'.repeat(4000)).join('\n')),
    )
    llm.chat.mockResolvedValue('[]')
    await service.parse(file('application/pdf') as never, scope)
    expect(llm.chat).toHaveBeenCalledTimes(12)
  })

  it.each([
    [
      'a fenced reply',
      '```json\n[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]\n```',
    ],
    [
      '[TBC] prose before the list',
      'Rooms [TBC]. Here: [{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]',
    ],
    [
      'an empty [] in prose before the list',
      'rooms: [] then [{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]',
    ],
    [
      'rows wrapped in an object',
      '{"rows":[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]}',
    ],
    [
      '[TBC] prose after the list',
      '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]\nNote: room [TBC]',
    ],
  ])('parses %s', async (_name, reply) => {
    llm.chat.mockResolvedValue(reply)
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result.rows).toHaveLength(1)
  })

  it('treats truncated JSON as an unreadable chunk', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"',
    )
    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      BadGatewayException,
    )
  })

  it('asks the LLM for up to 8000 tokens', async () => {
    await service.parse(file('application/pdf') as never, scope)
    expect(llm.chat.mock.calls[0][1]).toMatchObject({ maxTokens: 8000 })
  })

  it('converts a Buddhist-era year to the Gregorian year', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2569-05-12","startsAt":"09:00","title":"Final exam"}]',
    )
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result.rows[0].date).toBe('2026-05-12')
  })

  it('validates the converted date, so a Buddhist-era leap day is kept', async () => {
    jest.setSystemTime(new Date('2024-01-15T00:00:00Z'))
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2567-02-29","startsAt":"09:00","title":"Final exam"}]',
    )
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result.rows[0].date).toBe('2024-02-29')
  })

  it('drops and counts a row more than two years from today', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2031-05-12","startsAt":"09:00","title":"Final exam"}]',
    )
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result).toMatchObject({ rows: [], droppedCount: 1 })
  })

  it('leaves a normal date unchanged', async () => {
    llm.chat.mockResolvedValue(
      '[{"courseCode":"CS101","date":"2026-12-10","startsAt":"09:00","title":"Final exam"}]',
    )
    const result = await service.parse(file('application/pdf') as never, scope)
    expect(result.rows[0].date).toBe('2026-12-10')
  })
})

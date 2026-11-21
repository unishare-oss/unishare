import { BadRequestException } from '@nestjs/common'
import { ExamImportService } from './exam-import.service'

describe('ExamImportService.parse', () => {
  const scope = { kind: 'university' as const, universityId: 'university-1' }
  let service: ExamImportService
  let extractor: { extractFromBuffer: jest.Mock }
  let llm: { enabled: boolean; chat: jest.Mock }
  let courses: { findAllInScope: jest.Mock }
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
    service = new ExamImportService(extractor as never, llm as never, courses as never)
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
        matchStatus: 'matched',
      },
    ])
    expect(extractor.extractFromBuffer).toHaveBeenCalledWith(buffer, 'application/pdf')
    expect(llm.chat).toHaveBeenCalledTimes(1)
    expect(courses.findAllInScope).toHaveBeenCalledWith(scope)
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

  it('rejects a scope that includes multiple universities before extraction', async () => {
    await expect(service.parse(file('application/pdf') as never, { kind: 'all' })).rejects.toThrow(
      BadRequestException,
    )
    expect(extractor.extractFromBuffer).not.toHaveBeenCalled()
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
  })

  it('surfaces extraction failures', async () => {
    extractor.extractFromBuffer.mockRejectedValue(new Error('bad document'))

    await expect(service.parse(file('application/pdf') as never, scope)).rejects.toThrow(
      'bad document',
    )
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
})

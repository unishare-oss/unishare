import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@thallesp/nestjs-better-auth'
import request from 'supertest'
import { ExamsController } from '../src/modules/exams/exams.controller'
import { ExamsService } from '../src/modules/exams/exams.service'
import { ExamImportService } from '../src/modules/exams/exam-import.service'

describe('Exam bulk publish role (e2e)', () => {
  let app: INestApplication
  const bulkCreate = jest.fn()
  const parseImport = jest.fn()
  const user = {
    id: 'student-1',
    role: 'STUDENT',
    universityId: 'university-1',
    isAnonymous: false,
  }
  const auth = {
    api: {
      getSession: jest.fn().mockResolvedValue({
        user,
        session: { id: 'session-1' },
      }),
    },
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        { provide: ExamsService, useValue: { bulkCreate } },
        { provide: ExamImportService, useValue: { parse: parseImport } },
      ],
    }).compile()
    app = module.createNestApplication()
    app.useGlobalGuards(new AuthGuard(new Reflector(), { auth } as never))
    await app.init()
    await app.listen(0)
  })

  afterAll(async () => app.close())

  afterEach(() => {
    user.role = 'STUDENT'
    bulkCreate.mockClear()
    parseImport.mockClear()
  })

  it('forbids a student from publishing exam rows', async () => {
    await request(app.getHttpServer())
      .post('/exams/bulk')
      .send({
        exams: [{ courseId: 'course-1', title: 'Final exam', startsAt: '2026-12-10T02:00:00Z' }],
      })
      .expect(403)

    expect(bulkCreate).not.toHaveBeenCalled()
  })

  it('forbids a student from uploading an exam timetable', async () => {
    await request(app.getHttpServer())
      .post('/exams/import/parse')
      .attach('file', Buffer.from('pdf bytes'), {
        filename: 'timetable.pdf',
        contentType: 'application/pdf',
      })
      .expect(403)

    expect(parseImport).not.toHaveBeenCalled()
  })

  it('rejects unsupported timetable MIME types before invoking the import service', async () => {
    user.role = 'ADMIN'

    await request(app.getHttpServer())
      .post('/exams/import/parse')
      .attach('file', Buffer.from('image bytes'), {
        filename: 'timetable.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe('Only PDF and Word documents are supported'))

    expect(parseImport).not.toHaveBeenCalled()
  })

  it('enforces the 10 MB upload limit before invoking the import service', async () => {
    user.role = 'ADMIN'

    await request(app.getHttpServer())
      .post('/exams/import/parse')
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'timetable.pdf',
        contentType: 'application/pdf',
      })
      .expect(413)

    expect(parseImport).not.toHaveBeenCalled()
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ExamsService } from './exams.service'
import { ExamsRepository } from './exams.repository'
import { CoursesService } from '@/modules/courses/courses.service'
import { NotificationsService } from '@/modules/notifications/notifications.service'
import { MyCoursesService } from '@/modules/my-courses/my-courses.service'
import { UniversityScope } from '@/common/university-scope'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const ADMIN: UniversityScope = { kind: 'all' }

describe('ExamsService', () => {
  let service: ExamsService
  let repo: {
    create: jest.Mock
    findInRange: jest.Mock
    findById: jest.Mock
    update: jest.Mock
    remove: jest.Mock
    bulkCreate: jest.Mock
    findByCourseAndStart: jest.Mock
    findDueForReminder: jest.Mock
    markReminderSent: jest.Mock
  }
  let coursesService: { findOne: jest.Mock; findIdsInScope: jest.Mock }
  let notificationsService: { notifyExamReminder: jest.Mock }
  let myCoursesService: { findStudentIdsTaking: jest.Mock; getForStudent: jest.Mock }

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findInRange: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      bulkCreate: jest.fn(),
      findByCourseAndStart: jest.fn(),
      findDueForReminder: jest.fn(),
      markReminderSent: jest.fn(),
    }
    coursesService = { findOne: jest.fn(), findIdsInScope: jest.fn() }
    notificationsService = { notifyExamReminder: jest.fn() }
    myCoursesService = { findStudentIdsTaking: jest.fn(), getForStudent: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: ExamsRepository, useValue: repo },
        { provide: CoursesService, useValue: coursesService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MyCoursesService, useValue: myCoursesService },
      ],
    }).compile()

    service = module.get(ExamsService)
  })

  describe('create', () => {
    it('validates the course is in scope before creating', async () => {
      coursesService.findOne.mockResolvedValue({ id: 'c1' })
      repo.create.mockResolvedValue({
        id: 'e1',
        title: 'Midterm',
        startsAt: new Date('2026-10-01'),
        reminderSentAt: null,
        course: { id: 'c1', code: 'CS101', departmentId: 'd1', yearLevel: null },
      })

      await service.create({ courseId: 'c1', title: 'Midterm', startsAt: '2026-10-01' }, 'u1', U1)

      expect(coursesService.findOne).toHaveBeenCalledWith('c1', U1)
      expect(repo.create).toHaveBeenCalled()
    })

    it('propagates NotFoundException for a missing course', async () => {
      coursesService.findOne.mockRejectedValue(new NotFoundException('Course not found'))

      await expect(
        service.create({ courseId: 'bad', title: 'Midterm', startsAt: '2026-10-01' }, 'u1', U1),
      ).rejects.toThrow(NotFoundException)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejects an end time that is not after the start time', async () => {
      coursesService.findOne.mockResolvedValue({ id: 'c1' })

      await expect(
        service.create(
          {
            courseId: 'c1',
            title: 'Midterm',
            startsAt: '2026-10-01T14:00:00Z',
            endsAt: '2026-10-01T13:00:00Z',
          },
          'u1',
          U1,
        ),
      ).rejects.toThrow(BadRequestException)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('bulkCreate', () => {
    it('returns empty results without querying courses or repositories for no rows', async () => {
      await expect(service.bulkCreate([], 'moderator-1', U1)).resolves.toEqual({
        created: [],
        skipped: [],
      })

      expect(coursesService.findIdsInScope).not.toHaveBeenCalled()
      expect(repo.findByCourseAndStart).not.toHaveBeenCalled()
      expect(repo.bulkCreate).not.toHaveBeenCalled()
    })

    it('validates every course before creating the batch and reminds each created exam', async () => {
      const rows = [
        { courseId: 'c1', title: 'Final exam', startsAt: '2026-11-25T02:00:00.000Z' },
        { courseId: 'c2', title: 'Midterm', startsAt: '2026-12-01T02:00:00.000Z' },
      ]
      const exams = [
        { id: 'e1', startsAt: new Date('2026-11-25T02:00:00.000Z'), course: { code: 'CS101' } },
        { id: 'e2', startsAt: new Date('2026-12-01T02:00:00.000Z'), course: { code: 'CS102' } },
      ]
      coursesService.findIdsInScope.mockResolvedValue(['c1', 'c2'])
      repo.findByCourseAndStart.mockResolvedValue([])
      repo.bulkCreate.mockResolvedValue(exams)
      const reminderSpy = jest.spyOn(service, 'remindIfDue').mockResolvedValue()

      await expect(service.bulkCreate(rows, 'moderator-1', U1)).resolves.toEqual({
        created: exams,
        skipped: [],
      })

      expect(coursesService.findIdsInScope).toHaveBeenCalledWith(['c1', 'c2'], U1)
      expect(repo.findByCourseAndStart).toHaveBeenCalledWith([
        { courseId: 'c1', startsAt: new Date(rows[0].startsAt) },
        { courseId: 'c2', startsAt: new Date(rows[1].startsAt) },
      ])
      expect(repo.bulkCreate).toHaveBeenCalledWith(rows, 'moderator-1')
      expect(reminderSpy.mock.calls.map(([exam]) => exam.id)).toEqual(['e1', 'e2'])
    })

    it('returns duplicate skip reasons and reminds only created exams', async () => {
      const rows = [
        { courseId: 'c1', title: 'Final exam', startsAt: '2026-11-25T02:00:00.000Z' },
        { courseId: 'c1', title: 'Final exam', startsAt: '2026-11-25T02:00:00.000Z' },
        { courseId: 'c2', title: 'Final exam', startsAt: '2026-11-26T02:00:00.000Z' },
      ]
      const created = [
        { id: 'e1', startsAt: new Date(rows[2].startsAt), course: { code: 'CS102' } },
      ]
      coursesService.findIdsInScope.mockResolvedValue(['c1', 'c2'])
      repo.findByCourseAndStart.mockResolvedValue([
        { courseId: 'c1', startsAt: new Date(rows[0].startsAt) },
      ])
      repo.bulkCreate.mockResolvedValue(created)
      const reminderSpy = jest.spyOn(service, 'remindIfDue').mockResolvedValue()

      await expect(service.bulkCreate(rows, 'moderator-1', U1)).resolves.toEqual({
        created,
        skipped: [
          { index: 0, reason: 'existing' },
          { index: 1, reason: 'duplicate_in_request' },
        ],
      })
      expect(repo.bulkCreate).toHaveBeenCalledWith([rows[2]], 'moderator-1')
      expect(reminderSpy).toHaveBeenCalledTimes(1)
    })

    it('rejects the first course outside the moderator university without creating any rows', async () => {
      coursesService.findIdsInScope.mockResolvedValue(['c1'])
      const rows = [
        { courseId: 'c1', title: 'Final exam', startsAt: '2026-11-25T02:00:00.000Z' },
        {
          courseId: 'other-university-course',
          title: 'Midterm',
          startsAt: '2026-12-01T02:00:00.000Z',
        },
      ]

      await expect(service.bulkCreate(rows, 'moderator-1', U1)).rejects.toThrow(
        'Course in row 2 was not found',
      )
      expect(repo.bulkCreate).not.toHaveBeenCalled()
    })
  })

  describe('mine filter', () => {
    const range = ['2026-10-01', '2026-10-31'] as const

    it('limits exams to the final list courses', async () => {
      myCoursesService.getForStudent.mockResolvedValue({ final: [{ id: 'c1' }, { id: 'c2' }] })
      repo.findInRange.mockResolvedValue([])
      await service.findInRange(...range, U1, { studentId: 's1' })
      expect(myCoursesService.getForStudent).toHaveBeenCalledWith('s1')
      expect(repo.findInRange).toHaveBeenCalledWith(
        new Date(range[0]),
        new Date(range[1]),
        U1,
        undefined,
        ['c1', 'c2'],
      )
    })

    it('returns nothing for an empty final list', async () => {
      myCoursesService.getForStudent.mockResolvedValue({ final: [] })
      await expect(service.findInRange(...range, U1, { studentId: 's1' })).resolves.toEqual([])
      expect(repo.findInRange).not.toHaveBeenCalled()
    })

    it('intersects with courseId', async () => {
      myCoursesService.getForStudent.mockResolvedValue({ final: [{ id: 'c1' }, { id: 'c2' }] })
      repo.findInRange.mockResolvedValue([])
      await service.findInRange(...range, U1, { courseId: 'c2', studentId: 's1' })
      expect(repo.findInRange.mock.calls[0][4]).toEqual(['c2'])

      repo.findInRange.mockClear()
      await expect(
        service.findInRange(...range, U1, { courseId: 'c9', studentId: 's1' }),
      ).resolves.toEqual([])
      expect(repo.findInRange).not.toHaveBeenCalled()
    })

    it('does not touch the final list without mine', async () => {
      repo.findInRange.mockResolvedValue([])
      await service.findInRange(...range, U1, { courseId: 'c1' })
      expect(myCoursesService.getForStudent).not.toHaveBeenCalled()
      expect(repo.findInRange.mock.calls[0][4]).toEqual(['c1'])
    })
  })

  describe('university scope', () => {
    it('lists exams with the scope', async () => {
      repo.findInRange.mockResolvedValue([])
      await service.findInRange('2026-10-01', '2026-10-31', U1, { departmentId: 'd1' })
      expect(repo.findInRange).toHaveBeenCalledWith(
        new Date('2026-10-01'),
        new Date('2026-10-31'),
        U1,
        'd1',
        undefined,
      )
    })

    it('gives 404 for an exam outside the scope before checking the new course', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.update('e1', { courseId: 'c2' }, U1)).rejects.toThrow(NotFoundException)
      await expect(service.remove('e1', U1)).rejects.toThrow(NotFoundException)
      expect(repo.findById).toHaveBeenCalledWith('e1', U1)
      expect(coursesService.findOne).not.toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
      expect(repo.remove).not.toHaveBeenCalled()
    })

    it("gives 404 when creating an exam in another university's course", async () => {
      // CoursesService.findOne misses for a course outside the scope.
      coursesService.findOne.mockRejectedValue(new NotFoundException('Course not found'))
      await expect(
        service.create({ courseId: 'c2', title: 'Midterm', startsAt: '2026-10-01' }, 'u1', U1),
      ).rejects.toThrow(NotFoundException)
      expect(coursesService.findOne).toHaveBeenCalledWith('c2', U1)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it("gives 404 when moving an exam to another university's course", async () => {
      repo.findById.mockResolvedValue({
        id: 'e1',
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: null,
      })
      coursesService.findOne.mockRejectedValue(new NotFoundException('Course not found'))
      await expect(service.update('e1', { courseId: 'c2' }, U1)).rejects.toThrow(NotFoundException)
      expect(coursesService.findOne).toHaveBeenCalledWith('c2', U1)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('lets an admin create and move exams in any course', async () => {
      coursesService.findOne.mockResolvedValue({ id: 'c2' })
      repo.create.mockResolvedValue({
        id: 'e2',
        title: 'Midterm',
        startsAt: new Date('2026-10-01'),
        reminderSentAt: null,
        course: { id: 'c1', code: 'CS101', departmentId: 'd1', yearLevel: null },
      })
      repo.findById.mockResolvedValue({
        id: 'e1',
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: null,
      })
      await service.create(
        { courseId: 'c2', title: 'Midterm', startsAt: '2026-10-01' },
        'a1',
        ADMIN,
      )
      await service.update('e1', { courseId: 'c2' }, ADMIN)
      expect(coursesService.findOne).toHaveBeenCalledWith('c2', ADMIN)
      expect(repo.create).toHaveBeenCalled()
      expect(repo.update).toHaveBeenCalledWith('e1', { courseId: 'c2' })
    })
  })

  describe('update / remove', () => {
    it('throws NotFoundException when the exam does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.update('missing', { title: 'x' }, U1)).rejects.toThrow(NotFoundException)
      await expect(service.remove('missing', U1)).rejects.toThrow(NotFoundException)
    })

    it('validates the new end time against the existing start time when only endsAt changes', async () => {
      repo.findById.mockResolvedValue({
        id: 'e1',
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: null,
        course: { id: 'c1', departmentId: 'd1' },
      })

      await expect(service.update('e1', { endsAt: '2026-10-01T08:00:00Z' }, U1)).rejects.toThrow(
        BadRequestException,
      )
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('allows an update that keeps the existing valid time range', async () => {
      repo.findById.mockResolvedValue({
        id: 'e1',
        startsAt: new Date('2026-10-01T09:00:00Z'),
        endsAt: new Date('2026-10-01T11:00:00Z'),
        course: { id: 'c1', departmentId: 'd1' },
      })
      repo.update.mockResolvedValue({ id: 'e1' })

      await service.update('e1', { title: 'Renamed' }, U1)

      expect(repo.update).toHaveBeenCalledWith('e1', { title: 'Renamed' })
    })
  })

  describe('sendDueReminders', () => {
    const now = new Date('2026-09-01T00:00:00Z')

    it('does nothing when no exams are due', async () => {
      repo.findDueForReminder.mockResolvedValue([])
      await service.sendDueReminders(now)
      expect(notificationsService.notifyExamReminder).not.toHaveBeenCalled()
    })

    it('uses the final-list recipients for a course without a year level', async () => {
      const course = { id: 'c1', code: 'CS101', departmentId: 'd1', yearLevel: null }
      repo.findDueForReminder.mockResolvedValue([
        {
          id: 'e1',
          title: 'Final',
          startsAt: new Date('2026-09-15'),
          course,
        },
      ])
      myCoursesService.findStudentIdsTaking.mockResolvedValue(['added'])

      await service.sendDueReminders(now)

      expect(myCoursesService.findStudentIdsTaking).toHaveBeenCalledWith(course, now)
      expect(notificationsService.notifyExamReminder).toHaveBeenCalledWith(
        'e1',
        'CS101',
        'Final',
        expect.any(Date),
        ['added'],
      )
      expect(repo.markReminderSent).toHaveBeenCalledWith('e1', now)
    })

    it('uses the final-list recipients for a leveled course', async () => {
      const course = { id: 'c2', code: 'CS201', departmentId: 'd1', yearLevel: 2 }
      repo.findDueForReminder.mockResolvedValue([
        {
          id: 'e2',
          title: 'Midterm',
          startsAt: new Date('2026-09-15'),
          course,
        },
      ])
      myCoursesService.findStudentIdsTaking.mockResolvedValue(['automatic', 'added'])

      await service.sendDueReminders(now)

      expect(myCoursesService.findStudentIdsTaking).toHaveBeenCalledWith(course, now)
      expect(notificationsService.notifyExamReminder).toHaveBeenCalledWith(
        'e2',
        'CS201',
        'Midterm',
        expect.any(Date),
        ['automatic', 'added'],
      )
    })

    it('stamps the reminder even when the final list has no students taking the course', async () => {
      repo.findDueForReminder.mockResolvedValue([
        {
          id: 'e3',
          title: 'Final',
          startsAt: new Date('2026-09-15'),
          course: { id: 'c3', code: 'CS301', departmentId: 'd1', yearLevel: 3 },
        },
      ])
      myCoursesService.findStudentIdsTaking.mockResolvedValue([])

      await service.sendDueReminders(now)

      expect(notificationsService.notifyExamReminder).toHaveBeenCalledWith(
        'e3',
        'CS301',
        'Final',
        expect.any(Date),
        [],
      )
      expect(repo.markReminderSent).toHaveBeenCalledWith('e3', now)
    })
  })

  describe('ExamsService reminder windows', () => {
    it('queries the full 14-day window from now', async () => {
      const now = new Date('2026-11-19T03:00:00.000Z')
      const until = new Date('2026-12-03T03:00:00.000Z')

      repo.findDueForReminder.mockResolvedValue([])
      await service.sendDueReminders(now)

      expect(repo.findDueForReminder).toHaveBeenCalledWith(now, until)
    })

    it('reminds a newly created exam within 14 days and stamps it once', async () => {
      const now = new Date()
      const exam = {
        id: 'e1',
        title: 'Final',
        startsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        reminderSentAt: null,
        course: { id: 'c1', code: 'CS101', departmentId: 'd1', yearLevel: null },
      }
      myCoursesService.findStudentIdsTaking.mockResolvedValue(['u1'])
      repo.markReminderSent.mockResolvedValue(undefined)
      notificationsService.notifyExamReminder.mockResolvedValue(undefined)

      await service.remindIfDue(exam as any, now)

      expect(myCoursesService.findStudentIdsTaking).toHaveBeenCalledWith(exam.course, now)

      expect(notificationsService.notifyExamReminder).toHaveBeenCalledWith(
        'e1',
        'CS101',
        'Final',
        exam.startsAt,
        ['u1'],
      )
      expect(repo.markReminderSent).toHaveBeenCalledWith('e1', now)
    })
  })

  describe('ExamsService reminder delivery guards', () => {
    const now = new Date('2026-11-19T03:00:00.000Z')
    const exam = (overrides: Record<string, unknown> = {}) => ({
      id: 'e1',
      title: 'Final',
      startsAt: new Date('2026-11-22T03:00:00.000Z'),
      reminderSentAt: null,
      course: { id: 'c1', code: 'CS101', departmentId: 'd1', yearLevel: null },
      ...overrides,
    })

    it('skips exams that have started or already have a reminder', async () => {
      await service.remindIfDue(exam({ startsAt: new Date('2026-11-19T02:59:59.999Z') }), now)
      await service.remindIfDue(exam({ reminderSentAt: now }), now)

      expect(notificationsService.notifyExamReminder).not.toHaveBeenCalled()
      expect(repo.markReminderSent).not.toHaveBeenCalled()
    })

    it('creates an exam in the reminder window and sends its reminder immediately', async () => {
      const created = exam({ startsAt: new Date(Date.now() + 3 * 86400000) })
      repo.create.mockResolvedValue(created)
      coursesService.findOne.mockResolvedValue({ id: 'c1' })
      myCoursesService.findStudentIdsTaking.mockResolvedValue(['u1'])
      repo.markReminderSent.mockResolvedValue(undefined)
      notificationsService.notifyExamReminder.mockResolvedValue(undefined)

      await service.create(
        { courseId: 'c1', title: 'Final', startsAt: created.startsAt.toISOString() },
        'u1',
        U1,
      )

      expect(notificationsService.notifyExamReminder).toHaveBeenCalledTimes(1)
      expect(repo.markReminderSent).toHaveBeenCalledWith('e1', expect.any(Date))
    })

    it('does not remind or stamp an exam at or beyond the 14-day boundary', async () => {
      const now = new Date()
      const startsAt = new Date(now.getTime() + 15 * 86400000)
      const created = exam({ startsAt })
      repo.create.mockResolvedValue(created)
      coursesService.findOne.mockResolvedValue({ id: 'c1' })

      await service.create(
        { courseId: 'c1', title: 'Final', startsAt: startsAt.toISOString() },
        'u1',
        U1,
      )

      expect(notificationsService.notifyExamReminder).not.toHaveBeenCalled()
      expect(repo.markReminderSent).not.toHaveBeenCalled()
      expect(created.reminderSentAt).toBeNull()
    })

    it('does not remind or stamp when an exam starts exactly 14 days from now', async () => {
      const now = new Date('2026-11-19T03:00:00.000Z')
      const startsAt = new Date('2026-12-03T03:00:00.000Z')

      await service.remindIfDue(exam({ startsAt }), now)

      expect(notificationsService.notifyExamReminder).not.toHaveBeenCalled()
      expect(repo.markReminderSent).not.toHaveBeenCalled()
    })

    it.each(['recipient lookup', 'notification delivery'])(
      'returns the created exam unstamped when %s fails',
      async (failurePoint) => {
        const created = exam({ startsAt: new Date(Date.now() + 3 * 86400000) })
        repo.create.mockResolvedValue(created)
        coursesService.findOne.mockResolvedValue({ id: 'c1' })
        if (failurePoint === 'recipient lookup') {
          myCoursesService.findStudentIdsTaking.mockRejectedValue(new Error('sensitive detail'))
        } else {
          myCoursesService.findStudentIdsTaking.mockResolvedValue(['u1'])
          notificationsService.notifyExamReminder.mockRejectedValue(new Error('sensitive detail'))
        }

        await expect(
          service.create(
            { courseId: 'c1', title: 'Final', startsAt: created.startsAt.toISOString() },
            'u1',
            U1,
          ),
        ).resolves.toBe(created)

        expect(repo.markReminderSent).not.toHaveBeenCalled()
      },
    )

    it('sends each due exam once when a nightly run is repeated', async () => {
      const dueExam = exam()
      repo.findDueForReminder.mockResolvedValueOnce([dueExam]).mockResolvedValueOnce([])
      myCoursesService.findStudentIdsTaking.mockResolvedValue(['u1'])
      repo.markReminderSent.mockResolvedValue(undefined)
      notificationsService.notifyExamReminder.mockResolvedValue(undefined)

      await service.sendDueReminders(now)
      await service.sendDueReminders(now)

      expect(notificationsService.notifyExamReminder).toHaveBeenCalledTimes(1)
      expect(repo.markReminderSent).toHaveBeenCalledTimes(1)
    })
  })
})

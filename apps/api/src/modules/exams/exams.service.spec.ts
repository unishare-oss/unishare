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
    findDueForReminder: jest.Mock
    markReminderSent: jest.Mock
  }
  let coursesService: { findOne: jest.Mock }
  let notificationsService: { notifyExamReminder: jest.Mock }
  let myCoursesService: { findStudentIdsTaking: jest.Mock }

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findInRange: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findDueForReminder: jest.fn(),
      markReminderSent: jest.fn(),
    }
    coursesService = { findOne: jest.fn() }
    notificationsService = { notifyExamReminder: jest.fn() }
    myCoursesService = { findStudentIdsTaking: jest.fn() }

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
      repo.create.mockResolvedValue({ id: 'e1' })

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

  describe('university scope', () => {
    it('lists exams with the scope', async () => {
      repo.findInRange.mockResolvedValue([])
      await service.findInRange('2026-10-01', '2026-10-31', U1, 'd1')
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
})

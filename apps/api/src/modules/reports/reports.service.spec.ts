import { NotFoundException } from '@nestjs/common'
import { UniversityScope } from '@/common/university-scope'
import { ReportsService } from './reports.service'

const ALL: UniversityScope = { kind: 'all' }
const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const NONE: UniversityScope = { kind: 'none' }
const IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('ReportsService university scope', () => {
  let prisma: any
  let audit: { record: jest.Mock }
  let service: ReportsService

  beforeEach(() => {
    prisma = {
      post: { findUnique: jest.fn(), update: jest.fn() },
      report: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        update: jest.fn(),
      },
      adminAction: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([{ id: 'r1' }]),
    }
    audit = { record: jest.fn() }
    service = new ReportsService(prisma, audit as any)
  })

  describe('listReports', () => {
    it("lists only reports on the moderator's university's posts, in the list and the count", async () => {
      await service.listReports({ status: 'PENDING' } as any, U1)

      const where = { AND: [{ post: IN_U1 }, { status: 'PENDING' }] }
      expect(prisma.report.findMany.mock.calls[0][0].where).toEqual(where)
      expect(prisma.report.count).toHaveBeenCalledWith({ where })
    })

    it('lists nothing for a moderator with no university', async () => {
      await service.listReports({} as any, NONE)

      expect(prisma.report.findMany.mock.calls[0][0].where).toEqual({
        AND: [{ post: { course: { id: { in: [] } } } }],
      })
    })

    it('lists every university for an admin', async () => {
      await service.listReports({ reason: 'SPAM' } as any, ALL)

      expect(prisma.report.findMany.mock.calls[0][0].where).toEqual({
        AND: [{ post: {} }, { reason: 'SPAM' }],
      })
    })
  })

  describe.each([
    [
      'approveReport',
      (s: ReportsService, scope: UniversityScope) => s.approveReport('r1', 'mod-1', scope),
    ],
    [
      'rejectReport',
      (s: ReportsService, scope: UniversityScope) => s.rejectReport('r1', 'mod-1', scope),
    ],
  ])('%s', (_name, call) => {
    it("answers 404 for another university's report and changes nothing", async () => {
      prisma.report.findUnique.mockResolvedValue(null)

      await expect(call(service, U1)).rejects.toThrow(NotFoundException)
      expect(prisma.report.findUnique.mock.calls[0][0].where).toEqual({
        id: 'r1',
        AND: [{ post: IN_U1 }],
      })
      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(audit.record).not.toHaveBeenCalled()
    })

    it('answers 404 to a moderator with no university', async () => {
      prisma.report.findUnique.mockResolvedValue(null)

      await expect(call(service, NONE)).rejects.toThrow(NotFoundException)
      expect(prisma.report.findUnique.mock.calls[0][0].where.AND).toEqual([
        { post: { course: { id: { in: [] } } } },
      ])
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it("lets an admin act on any university's report", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        postId: 'p2',
        status: 'PENDING',
        reason: 'SPAM',
      })

      await call(service, ALL)

      expect(prisma.report.findUnique.mock.calls[0][0].where).toEqual({
        id: 'r1',
        AND: [{ post: {} }],
      })
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('createReport', () => {
    it("answers 404 to a member reporting another university's post", async () => {
      prisma.post.findUnique.mockResolvedValue(null)

      await expect(
        service.createReport('p2', 'user-1', { reason: 'SPAM' } as any, U1),
      ).rejects.toThrow(NotFoundException)
      expect(prisma.post.findUnique.mock.calls[0][0].where).toEqual({ id: 'p2', AND: [IN_U1] })
      expect(prisma.report.create).not.toHaveBeenCalled()
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('creates the report for a post in scope', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1' })
      prisma.report.findUnique.mockResolvedValue(null)

      await service.createReport('p1', 'user-1', { reason: 'SPAM' } as any, U1)

      expect(prisma.report.create).toHaveBeenCalled()
    })
  })
})

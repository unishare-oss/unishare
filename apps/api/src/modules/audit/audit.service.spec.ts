import type { PrismaService } from '@/prisma/prisma.service'
import { AuditService } from './audit.service'
import { AuditAction, AUDIT_RETENTION_DAYS } from './audit.actions'

describe('AuditService', () => {
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock; deleteMany: jest.Mock }
    user: { findUnique: jest.Mock }
  }
  let service: AuditService

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Ada', role: 'ADMIN' }) },
    }
    service = new AuditService(prisma as unknown as PrismaService)
  })

  const flush = () => new Promise((resolve) => setImmediate(resolve))

  describe('record', () => {
    it("snapshots the actor's name and role when the caller gave only an id", async () => {
      service.record({ action: AuditAction.PostDelete, actorId: 'u1', targetType: 'post' })
      await flush()
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'post.delete',
          actorId: 'u1',
          actorName: 'Ada',
          actorRole: 'ADMIN',
          targetType: 'post',
        }),
      })
    })

    it('skips the user lookup when name and role are already known', async () => {
      service.record({
        action: AuditAction.UserDelete,
        actorId: 'u1',
        actorName: 'Ada',
        actorRole: 'STUDENT',
      })
      await flush()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.auditLog.create).toHaveBeenCalled()
    })

    it('never throws into the caller when the write fails', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'))
      expect(() => service.record({ action: AuditAction.PostDelete, actorId: 'u1' })).not.toThrow()
      await flush()
    })

    it('truncates an oversized user agent', async () => {
      service.record({ action: AuditAction.AuthSignIn, userAgent: 'x'.repeat(1000) })
      await flush()
      const { data } = prisma.auditLog.create.mock.calls[0][0]
      expect(data.userAgent).toHaveLength(300)
    })
  })

  describe('list', () => {
    it('applies filters, newest first, with page offsets', async () => {
      await service.list({
        action: AuditAction.UserBan,
        actorId: 'u1',
        from: '2026-09-01T00:00:00.000Z',
        page: 3,
        limit: 10,
      })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'user.ban',
          actorId: 'u1',
          createdAt: { gte: new Date('2026-09-01T00:00:00.000Z') },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
      })
    })

    it('filters a whole category by action prefix', async () => {
      await service.list({ category: 'user' })
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: { startsWith: 'user.' } } }),
      )
    })

    it('defaults to page 1 of 50', async () => {
      const result = await service.list({})
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 50 }),
      )
      expect(result).toEqual({ logs: [], total: 0, page: 1, limit: 50 })
    })
  })

  describe('pruneOld', () => {
    it('deletes only rows older than the retention window', async () => {
      const now = new Date('2026-09-29T00:00:00.000Z')
      await expect(service.pruneOld(now)).resolves.toBe(3)
      const { where } = prisma.auditLog.deleteMany.mock.calls[0][0]
      const expected = now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000
      expect(where.createdAt.lt.getTime()).toBe(expected)
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { TasksService } from './tasks.service'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'

describe('TasksService', () => {
  let service: TasksService
  let prisma: {
    user: { deleteMany: jest.Mock; updateMany: jest.Mock }
    notification: { deleteMany: jest.Mock }
    session: { deleteMany: jest.Mock }
    comment: { deleteMany: jest.Mock }
    post: { findMany: jest.Mock; deleteMany: jest.Mock }
    [key: string]: any
  }
  let storage: { deleteFile: jest.Mock }

  beforeEach(async () => {
    prisma = {
      user: { deleteMany: jest.fn(), updateMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      session: { deleteMany: jest.fn() },
      comment: { deleteMany: jest.fn() },
      post: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }
    storage = { deleteFile: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile()

    service = module.get<TasksService>(TasksService)
  })

  describe('pruneAnonymousUsers', () => {
    it('should call prisma.user.deleteMany with isAnonymous and 7-day cutoff', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 })

      const before = new Date()
      await service.pruneAnonymousUsers()

      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          isAnonymous: true,
          createdAt: { lt: expect.any(Date) },
        },
      })

      // Verify the cutoff date is approximately 7 days ago
      const cutoffArg = prisma.user.deleteMany.mock.calls[0][0].where.createdAt.lt as Date
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const expectedCutoff = new Date(before.getTime() - sevenDaysMs)
      expect(Math.abs(cutoffArg.getTime() - expectedCutoff.getTime())).toBeLessThan(5000) // within 5s
    })

    it('should log when users are pruned', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 3 })
      const logSpy = jest.spyOn(service['logger'], 'log')

      await service.pruneAnonymousUsers()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3 anonymous users'))
    })

    it('should not log when no users are pruned', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 })
      const logSpy = jest.spyOn(service['logger'], 'log')

      await service.pruneAnonymousUsers()

      expect(logSpy).not.toHaveBeenCalled()
    })
  })
})

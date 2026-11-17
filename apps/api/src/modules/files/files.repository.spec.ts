import { PrismaService } from '@/prisma/prisma.service'
import { FilesRepository } from './files.repository'
import { PendingUploadsRepository } from '@/modules/storage/pending-uploads.repository'
import { PendingUploadsService } from '@/modules/storage/pending-uploads.service'
import { StorageService } from '@/modules/storage/storage.service'
import { CronLockService } from '@/common/cron-lock.service'

describe('FilesRepository.createWithPendingClaim', () => {
  it('claims the pending key and creates the file in one transaction', async () => {
    const pendingUpload = { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }
    const file = { create: jest.fn().mockResolvedValue({ id: 'f1' }) }
    const transaction = { pendingUpload, file }
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    }
    const repository = new FilesRepository(prisma as unknown as PrismaService)
    const dto = { key: 'posts/u1/a.pdf', name: 'a.pdf', size: 12, mimeType: 'application/pdf' }

    await expect(repository.createWithPendingClaim('p1', dto, 'u1')).resolves.toEqual({
      claimed: true,
      file: { id: 'f1' },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(pendingUpload.deleteMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'u1',
        expiresAt: { gt: expect.any(Date) },
        cleanupReservedAt: null,
        OR: [{ key: dto.key, mimeType: dto.mimeType }],
      },
    })
    expect(file.create).toHaveBeenCalledWith({ data: { postId: 'p1', ...dto } })
  })

  it('does not create a file if the pending record was claimed or reserved first', async () => {
    const pendingUpload = { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) }
    const file = { create: jest.fn() }
    const transaction = { pendingUpload, file }
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    }
    const repository = new FilesRepository(prisma as unknown as PrismaService)

    await expect(
      repository.createWithPendingClaim(
        'p1',
        {
          key: 'posts/u1/a.pdf',
          name: 'a.pdf',
          size: 12,
          mimeType: 'application/pdf',
        },
        'u1',
      ),
    ).resolves.toEqual({ claimed: false })
    expect(file.create).not.toHaveBeenCalled()
  })

  it('keeps a claimed key out of expired-upload cleanup', async () => {
    let record: any = {
      key: 'posts/u1/a.pdf',
      ownerId: 'u1',
      mimeType: 'application/pdf',
      expiresAt: new Date('2026-11-16T00:00:00Z'),
      cleanupReservedAt: null,
    }
    const pendingUpload = {
      deleteMany: jest.fn(async ({ where }: any) => {
        const eligible =
          record?.key === where.key &&
          record.ownerId === where.ownerId &&
          record.mimeType === where.mimeType &&
          record.cleanupReservedAt === null
        if (eligible) record = null
        return { count: eligible ? 1 : 0 }
      }),
      findMany: jest.fn(async () => (record ? [{ key: record.key }] : [])),
      updateMany: jest.fn(async () => ({ count: 0 })),
    }
    const transaction = {
      pendingUpload,
      file: { create: jest.fn().mockResolvedValue({ id: 'f1' }) },
    }
    const prisma = {
      pendingUpload,
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    }
    const pendingRepository = new PendingUploadsRepository(prisma as unknown as PrismaService)
    const filesRepository = new FilesRepository(prisma as unknown as PrismaService)
    await filesRepository.createWithPendingClaim(
      'p1',
      {
        key: 'posts/u1/a.pdf',
        name: 'a.pdf',
        size: 12,
        mimeType: 'application/pdf',
      },
      'u1',
    )
    const storage = { deleteFile: jest.fn() }
    const service = new PendingUploadsService(
      pendingRepository,
      storage as unknown as StorageService,
      {
        acquire: jest.fn().mockResolvedValue(true),
        release: jest.fn().mockResolvedValue(undefined),
      } as unknown as CronLockService,
    )
    await service.cleanupExpiredBatch(new Date('2026-11-17T00:00:00Z'))
    expect(storage.deleteFile).not.toHaveBeenCalledWith('posts/u1/a.pdf')
  })
})

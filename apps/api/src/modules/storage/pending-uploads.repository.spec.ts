import { PrismaService } from '@/prisma/prisma.service'
import { PendingUploadsRepository } from './pending-uploads.repository'

describe('PendingUploadsRepository claimable lookups', () => {
  let prisma: any
  let repository: PendingUploadsRepository

  beforeEach(() => {
    prisma = {
      pendingUpload: {
        findFirst: jest.fn().mockResolvedValue({ key: 'posts/u1/a.pdf' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    repository = new PendingUploadsRepository(prisma as PrismaService)
  })

  it('filters a single claimable key by owner, MIME, expiry, and cleanup reservation', async () => {
    await repository.findClaimableByKey('u1', {
      key: 'posts/u1/a.pdf',
      mimeType: 'application/pdf',
    })
    expect(prisma.pendingUpload.findFirst).toHaveBeenCalledWith({
      where: {
        ownerId: 'u1',
        expiresAt: { gt: expect.any(Date) },
        cleanupReservedAt: null,
        OR: [{ key: 'posts/u1/a.pdf', mimeType: 'application/pdf' }],
      },
    })
  })

  it('applies the same claimable filter to suggestion references', async () => {
    await repository.findAvailable('u1', [
      { key: 'posts/u1/a.pdf', mimeType: 'application/pdf' },
      { key: 'posts/u1/b.doc', mimeType: 'application/msword' },
    ])
    expect(prisma.pendingUpload.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'u1',
        expiresAt: { gt: expect.any(Date) },
        cleanupReservedAt: null,
        OR: [
          { key: 'posts/u1/a.pdf', mimeType: 'application/pdf' },
          { key: 'posts/u1/b.doc', mimeType: 'application/msword' },
        ],
      },
    })
  })
})

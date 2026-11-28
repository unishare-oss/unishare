import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CronLockService } from '@/common/cron-lock.service'
import { PendingUploadsRepository } from './pending-uploads.repository'
import { PendingUploadsService } from './pending-uploads.service'
import { StorageService } from './storage.service'

describe('PendingUploadsService', () => {
  let repository: Record<string, jest.Mock>
  let storage: { deleteFile: jest.Mock }
  let cronLock: { acquire: jest.Mock; release: jest.Mock }
  let service: PendingUploadsService

  beforeEach(() => {
    repository = {
      findAvailable: jest.fn().mockResolvedValue([]),
      findByKey: jest.fn().mockResolvedValue({ key: 'posts/u1/a.pdf' }),
      findClaimableByKey: jest.fn().mockResolvedValue({
        key: 'posts/u1/a.pdf',
        ownerId: 'u1',
        mimeType: 'application/pdf',
        expiresAt: new Date(Date.now() + 60_000),
        cleanupReservedAt: null,
      }),
      findExpired: jest.fn().mockResolvedValue([]),
      reserveExpired: jest.fn().mockResolvedValue({ count: 1 }),
      deleteReserved: jest.fn().mockResolvedValue({ count: 1 }),
      releaseReservation: jest.fn().mockResolvedValue({ count: 1 }),
    }
    storage = { deleteFile: jest.fn().mockResolvedValue(undefined) }
    cronLock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    }
    service = new PendingUploadsService(
      repository as unknown as PendingUploadsRepository,
      storage as unknown as StorageService,
      cronLock as unknown as CronLockService,
    )
  })

  afterEach(() => jest.restoreAllMocks())

  it('rejects suggestion reads when an upload is not owned by the requester', async () => {
    await expect(
      service.assertAvailable('u1', [{ key: 'posts/u2/a.pdf', mimeType: 'application/pdf' }]),
    ).rejects.toThrow(NotFoundException)
    expect(repository.findAvailable).toHaveBeenCalledWith('u1', [
      { key: 'posts/u2/a.pdf', mimeType: 'application/pdf' },
    ])
  })

  it('returns an owned and available record for an optional attachment claim', async () => {
    const result = await service.getClaimableUpload(
      'u1',
      { key: 'posts/u1/a.pdf', name: 'a.pdf', size: 12, mimeType: 'application/pdf' },
      false,
    )
    expect(result.ownerId).toBe('u1')
    expect(repository.findClaimableByKey).toHaveBeenCalledWith('u1', {
      key: 'posts/u1/a.pdf',
      name: 'a.pdf',
      size: 12,
      mimeType: 'application/pdf',
    })
  })

  it('requires a pending record for pre-Share confirmation', async () => {
    repository.findByKey.mockResolvedValue(null)
    repository.findClaimableByKey.mockResolvedValue(null)
    await expect(
      service.getClaimableUpload(
        'u1',
        {
          key: 'posts/u1/a.pdf',
          name: 'a.pdf',
          size: 12,
          mimeType: 'application/pdf',
        },
        true,
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects an existing pending record that is not claimable instead of falling back to MCP behavior', async () => {
    repository.findClaimableByKey.mockResolvedValue(null)
    await expect(
      service.getClaimableUpload(
        'u1',
        { key: 'posts/u1/a.pdf', name: 'a.pdf', size: 12, mimeType: 'application/pdf' },
        false,
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('does not delete a key when cleanup reservation loses a race', async () => {
    repository.findExpired.mockResolvedValue([{ key: 'posts/u1/a.pdf' }])
    repository.reserveExpired.mockResolvedValue({ count: 0 })

    await service.cleanupExpiredBatch(new Date('2026-11-17T00:00:00.000Z'))

    expect(storage.deleteFile).not.toHaveBeenCalled()
    expect(repository.deleteReserved).not.toHaveBeenCalled()
  })

  it('uses a distributed lock for the hourly cleanup', async () => {
    cronLock.acquire.mockResolvedValue(false)

    await service.cleanupExpiredBatch()

    expect(repository.findExpired).not.toHaveBeenCalled()
    expect(storage.deleteFile).not.toHaveBeenCalled()
    expect(cronLock.release).not.toHaveBeenCalled()
  })

  it('cleans a reserved upload and releases its reservation if storage deletion fails', async () => {
    repository.findExpired.mockResolvedValue([{ key: 'posts/u1/a.pdf' }])
    storage.deleteFile.mockRejectedValue(new Error('storage unavailable'))

    await service.cleanupExpiredBatch(new Date('2026-11-17T00:00:00.000Z'))

    expect(repository.releaseReservation).toHaveBeenCalledWith(
      'posts/u1/a.pdf',
      new Date('2026-11-17T00:00:00.000Z'),
    )
  })
})

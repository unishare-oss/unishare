import { Test, TestingModule } from '@nestjs/testing'
import { CronLockService } from '@/common/cron-lock.service'
import {
  ChatCleanupService,
  CHAT_CLEANUP_LOCK_KEY,
  CHAT_CLEANUP_LOCK_TTL_MS,
} from './chat-cleanup.service'
import { ChatRepository } from './chat.repository'
import { StorageService } from '../storage/storage.service'

describe('ChatCleanupService', () => {
  let service: ChatCleanupService
  let repoMock: {
    findMessagesReadyForS3Cleanup: jest.Mock
    clearFileAfterCleanup: jest.Mock
  }
  let storageMock: { extractKeyFromUrl: jest.Mock; deleteFile: jest.Mock }
  let cronLockMock: { acquire: jest.Mock; release: jest.Mock; renew: jest.Mock }

  beforeEach(async () => {
    repoMock = {
      findMessagesReadyForS3Cleanup: jest
        .fn()
        .mockResolvedValue([{ id: 'm1', fileUrl: 'https://s3/a.png' }]),
      clearFileAfterCleanup: jest.fn().mockResolvedValue(undefined),
    }
    storageMock = {
      extractKeyFromUrl: jest.fn().mockReturnValue('a.png'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    }
    cronLockMock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
      renew: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatCleanupService,
        { provide: ChatRepository, useValue: repoMock },
        { provide: StorageService, useValue: storageMock },
        { provide: CronLockService, useValue: cronLockMock },
      ],
    }).compile()

    service = module.get(ChatCleanupService)
  })

  it('acquires the cleanup lock with its TTL', async () => {
    await service.cleanupExpiredFiles()
    expect(cronLockMock.acquire).toHaveBeenCalledWith(
      CHAT_CLEANUP_LOCK_KEY,
      CHAT_CLEANUP_LOCK_TTL_MS,
    )
  })

  it('cleans up and releases the lock when it is acquired', async () => {
    await service.cleanupExpiredFiles()

    expect(storageMock.deleteFile).toHaveBeenCalledWith('a.png')
    expect(repoMock.clearFileAfterCleanup).toHaveBeenCalledWith(['m1'])
    expect(cronLockMock.release).toHaveBeenCalledWith(CHAT_CLEANUP_LOCK_KEY)
  })

  // Without the lock both replicas read the same message list and race to delete the same S3
  // objects; the loser then logs "Failed to delete S3 file" for an object already gone.
  it('does NOT read or delete anything when another replica holds the lock', async () => {
    cronLockMock.acquire.mockResolvedValue(false)
    await service.cleanupExpiredFiles()

    expect(repoMock.findMessagesReadyForS3Cleanup).not.toHaveBeenCalled()
    expect(storageMock.deleteFile).not.toHaveBeenCalled()
    expect(repoMock.clearFileAfterCleanup).not.toHaveBeenCalled()
  })

  it('does NOT release a lock it never held', async () => {
    cronLockMock.acquire.mockResolvedValue(false)
    await service.cleanupExpiredFiles()

    expect(cronLockMock.release).not.toHaveBeenCalled()
  })

  // A leaked lock disables the cleanup on every replica for a full TTL without erroring.
  it('releases the lock even when the cleanup throws', async () => {
    repoMock.findMessagesReadyForS3Cleanup.mockRejectedValue(new Error('db down'))
    await expect(service.cleanupExpiredFiles()).rejects.toThrow('db down')

    expect(cronLockMock.release).toHaveBeenCalledWith(CHAT_CLEANUP_LOCK_KEY)
  })

  // The early `return` for an empty list sits INSIDE the locked callback, so it must still
  // release. A lock held past an early return is exactly how a job silently stops running.
  it('releases the lock when there is nothing to clean up', async () => {
    repoMock.findMessagesReadyForS3Cleanup.mockResolvedValue([])
    await service.cleanupExpiredFiles()

    expect(cronLockMock.release).toHaveBeenCalledWith(CHAT_CLEANUP_LOCK_KEY)
  })

  it('does not reject when releasing the lock fails', async () => {
    cronLockMock.release.mockRejectedValue(new Error('redis gone'))
    await expect(service.cleanupExpiredFiles()).resolves.toBeUndefined()
  })

  // Pins the VALUE: every assertion above reads the same constant the implementation reads.
  it('pins a TTL far below the daily cadence', () => {
    expect(CHAT_CLEANUP_LOCK_TTL_MS).toBe(5 * 60 * 1000)
    expect(CHAT_CLEANUP_LOCK_TTL_MS).toBeLessThan(24 * 60 * 60 * 1000)
  })
})

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { StorageService } from './storage.service'
import { PendingUploadsRepository } from './pending-uploads.repository'
import type { PendingUploadFile, PendingUploadReference } from './pending-uploads.types'

const CLEANUP_RESERVATION_TTL_MS = 15 * 60 * 1000
const PENDING_UPLOAD_CLEANUP_LOCK_KEY = 'pending-upload-cleanup'
const PENDING_UPLOAD_CLEANUP_LOCK_TTL_MS = 5 * 60 * 1000

@Injectable()
export class PendingUploadsService {
  private readonly logger = new Logger(PendingUploadsService.name)

  constructor(
    private readonly repository: PendingUploadsRepository,
    private readonly storage: StorageService,
    private readonly cronLock: CronLockService,
  ) {}

  async assertAvailable(ownerId: string, references: PendingUploadReference[]) {
    const records = await this.repository.findAvailable(ownerId, references)
    const byKey = new Map(records.map((record) => [record.key, record]))
    if (
      references.some(
        ({ key, mimeType }) => !byKey.has(key) || byKey.get(key)?.mimeType !== mimeType,
      )
    ) {
      throw new NotFoundException('Uploaded file not found')
    }
    return [...new Set(references.map(({ key }) => key))].map((key) => byKey.get(key)!)
  }

  async getClaimableUpload(ownerId: string, dto: PendingUploadFile, required: boolean) {
    const existing = await this.repository.findByKey(dto.key)
    if (!existing) {
      if (required) throw new BadRequestException('Uploaded file is no longer available')
      return null
    }

    const record = await this.repository.findClaimableByKey(ownerId, dto)
    if (!record) throw new BadRequestException('Uploaded file is no longer available')
    return record
  }

  @Cron('0 * * * *')
  async cleanupExpiredBatch(now = new Date()) {
    let cleaned = 0
    await runWithCronLock(
      this.cronLock,
      PENDING_UPLOAD_CLEANUP_LOCK_KEY,
      PENDING_UPLOAD_CLEANUP_LOCK_TTL_MS,
      this.logger,
      async () => {
        const reclaimBefore = new Date(now.getTime() - CLEANUP_RESERVATION_TTL_MS)
        const expired = await this.repository.findExpired(now, reclaimBefore)
        for (const { key } of expired) {
          const reservation = await this.repository.reserveExpired(key, now, reclaimBefore)
          if (reservation.count !== 1) continue
          try {
            await this.storage.deleteFile(key)
            await this.repository.deleteReserved(key, now)
            cleaned++
          } catch (error) {
            this.logger.warn(`Could not delete expired pending upload: ${(error as Error).message}`)
            await this.repository.releaseReservation(key, now)
          }
        }
      },
    )
    return cleaned
  }
}

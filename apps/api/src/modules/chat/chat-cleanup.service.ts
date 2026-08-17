import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { ChatRepository } from './chat.repository'
import { StorageService } from '../storage/storage.service'

/** Bare job name -- CronLockService owns the `cron-lock:` namespace. */
export const CHAT_CLEANUP_LOCK_KEY = 'chat-file-cleanup'
/**
 * Daily at 00:00, so the cadence bound is 24 hours and five minutes is nowhere near it -- a
 * crashed holder is long released before the next tick.
 *
 * The job itself is an S3 delete per expired message file, realistically seconds. Overrunning
 * the TTL is inert for a daily job: the other pod is not due back until tomorrow, so nobody is
 * waiting to take the lock the moment it lapses. What the lock actually buys is the tick
 * itself -- without it both replicas read the same message list and race to delete the same S3
 * objects, and the loser logs "Failed to delete S3 file" for an object that is already gone.
 */
export const CHAT_CLEANUP_LOCK_TTL_MS = 5 * 60 * 1000

@Injectable()
export class ChatCleanupService {
  private readonly logger = new Logger(ChatCleanupService.name)

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly storageService: StorageService,
    private readonly cronLock: CronLockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredFiles() {
    await runWithCronLock(
      this.cronLock,
      CHAT_CLEANUP_LOCK_KEY,
      CHAT_CLEANUP_LOCK_TTL_MS,
      this.logger,
      async () => {
        const messages = await this.chatRepository.findMessagesReadyForS3Cleanup()
        if (messages.length === 0) return

        let deleted = 0
        for (const msg of messages) {
          if (msg.fileUrl) {
            try {
              const key = this.storageService.extractKeyFromUrl(msg.fileUrl)
              await this.storageService.deleteFile(key)
              deleted++
            } catch (err) {
              this.logger.warn(`Failed to delete S3 file for message ${msg.id}: ${err}`)
            }
          }
        }

        await this.chatRepository.clearFileAfterCleanup(messages.map((m) => m.id))
        this.logger.log(`Cleaned up ${deleted} expired file(s) from S3`)
      },
    )
  }
}

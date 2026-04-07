import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ChatRepository } from './chat.repository'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class ChatCleanupService {
  private readonly logger = new Logger(ChatCleanupService.name)

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly storageService: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredFiles() {
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
  }
}

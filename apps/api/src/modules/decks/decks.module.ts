import { Module, OnModuleInit } from '@nestjs/common'
import { BullModule, InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { DECK_CONCURRENCY, DECK_QUEUE } from './decks.constants'
import { DECK_EDITOR, DECK_GENERATOR } from './deck-generator.port'
import { PresentonClient } from './presenton/presenton.client'
import { PresentonAccountsService } from './presenton/presenton-accounts.service'
import { DecksController } from './decks.controller'
import { DecksProcessor } from './decks.processor'
import { DecksService } from './decks.service'
import { DecksFrameAuthService } from './decks.frame-auth.service'

@Module({
  imports: [BullModule.registerQueue({ name: DECK_QUEUE })],
  controllers: [DecksController],
  providers: [
    DecksService,
    DecksProcessor,
    DecksFrameAuthService,
    // Brokers one generator account per student, so decks are owned by the person who asked
    // for them rather than piled under a single administrator key.
    PresentonAccountsService,
    // The ONLY lines that name a vendor. Swapping generators is a change here and nowhere else.
    // One class satisfies both ports; they stay separate so a backend that can generate but
    // not edit is still usable.
    PresentonClient,
    { provide: DECK_GENERATOR, useExisting: PresentonClient },
    { provide: DECK_EDITOR, useExisting: PresentonClient },
  ],
  exports: [DecksService],
})
export class DecksModule implements OnModuleInit {
  constructor(@InjectQueue(DECK_QUEUE) private readonly queue: Queue) {}

  /**
   * Global, not per-worker: the cap has to hold across every replica, otherwise scaling the
   * API to two pods silently doubles concurrent model spend.
   */
  async onModuleInit() {
    await this.queue.setGlobalConcurrency(DECK_CONCURRENCY)
  }
}

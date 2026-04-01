import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { FeedbackService } from './feedback.service'
import { FeedbackRepository } from './feedback.repository'
import { FeedbackController, AdminFeedbackController } from './feedback.controller'

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService, FeedbackRepository],
  exports: [FeedbackService],
})
export class FeedbackModule {}

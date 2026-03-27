import { Module } from '@nestjs/common'
import { AiSummaryService } from './ai-summary.service'

@Module({
  providers: [AiSummaryService],
  exports: [AiSummaryService],
})
export class AiSummaryModule {}
